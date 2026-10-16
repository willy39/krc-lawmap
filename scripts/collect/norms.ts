// 규범 축 수집: law · eflaw · admrul · ordin · trty · pi (설계서 4.1)
import type { NormItem, OrdinanceBundle } from '../../src/types/model.ts';
import { admrulSeqUrl, admrulUrl, lawUrl, ordinSeqUrl, ordinUrl, piSeqUrl, trtySeqUrl } from '../../src/lib/links.ts';
import type { Config } from '../lib/config.ts';
import { isoDate, stripTags, type NormDraft } from '../lib/drafts.ts';
import { normalizeLawName } from '../lib/citation.ts';
import { pick, search, service, type LawApiOptions } from '../lib/lawApi.ts';

type Json = Record<string, unknown>;

export interface NormCollectResult {
  drafts: NormDraft[];
  piTotal: number | null;
  failed: string[]; // 실패한 수집 단위 (이전 스냅샷 유지 대상)
}

async function guarded<T>(label: string, failed: string[], fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`  ✗ ${label}: ${e instanceof Error ? e.message : e}`);
    failed.push(label);
    return fallback;
  }
}

function lawArticles(detail: Json): NormItem['articles'] {
  const units = (detail['조문'] as Json | undefined)?.['조문단위'];
  const list = Array.isArray(units) ? (units as Json[]) : units ? [units as Json] : [];
  return list
    .filter((u) => pick(u, ['조문여부']) !== '전문')
    .map((u) => {
      const no = pick(u, ['조문번호']) ?? '';
      const branch = pick(u, ['조문가지번호']);
      return { no: `제${no}조${branch ? `의${branch}` : ''}`, title: pick(u, ['조문제목']) ?? '' };
    })
    .filter((a) => a.no !== '제조');
}

export async function collectNorms(cfg: Config, api: LawApiOptions): Promise<NormCollectResult> {
  const failed: string[] = [];
  const drafts: NormDraft[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // 1) 법령 (큐레이션 목록) — law + eflaw
  const laws = [...cfg.overrides.core_laws.map((l) => ({ ...l, isCore: true })), ...cfg.overrides.curated_laws];
  for (const law of laws) {
    const d = await guarded(`law:${law.name}`, failed, async () => {
      const { items } = await search({ target: 'law', query: law.name }, api);
      const hit = items.find((i) => normalizeLawName(pick(i, ['법령명한글', '법령명']) ?? '') === normalizeLawName(law.name));
      if (!hit) throw new Error('정확히 일치하는 법령 없음 (이름 확인 필요)');
      const mst = pick(hit, ['법령일련번호', 'MST']) ?? '';
      const draft: NormDraft = {
        id: `law:${law.name}`,
        source: 'law',
        sourceId: pick(hit, ['법령ID']) ?? mst,
        title: law.name,
        kind: pick(hit, ['법령구분명']) ?? '법률',
        agency: pick(hit, ['소관부처명']) ?? '',
        url: lawUrl(law.name),
        level: law.level ?? 'L1R_RELATED',
        field: law.field,
        isCore: law.isCore ?? false,
        parentName: law.parent,
        promulgatedAt: isoDate(pick(hit, ['공포일자'])),
        effectiveAt: isoDate(pick(hit, ['시행일자'])),
        revisionType: pick(hit, ['제개정구분명']),
      };
      if (draft.isCore && mst) {
        const detail = await service('law', mst, api, 'MST');
        draft.articles = lawArticles(detail);
      }
      const ef = await search({ target: 'eflaw', query: law.name }, api).catch(() => ({ items: [] as Json[] }));
      const future = ef.items
        .filter((i) => normalizeLawName(pick(i, ['법령명한글', '법령명']) ?? '') === normalizeLawName(law.name))
        .map((i) => isoDate(pick(i, ['시행일자'])))
        .filter((x): x is string => !!x && x > today)
        .sort()[0];
      if (future) draft.upcoming = { effectiveAt: future };
      return draft;
    }, null);
    if (d) drafts.push(d);
  }

  // 2) 행정규칙 — 본문(search=2)에 기관명이 등장하는 고시·훈령 (제목 검색은 실측상 0건)
  const titleFilter = cfg.overrides.admrul_title_filter ? new RegExp(cfg.overrides.admrul_title_filter) : null;
  for (const q of cfg.overrides.admrul_queries) {
    const items = await guarded(`admrul:${q}`, failed, async () => (await search({ target: 'admrul', query: q, search: 2 }, api)).items, []);
    for (const i of items) {
      const title = pick(i, ['행정규칙명']) ?? '';
      const seq = pick(i, ['행정규칙일련번호']) ?? '';
      const sid = pick(i, ['행정규칙ID']) ?? seq;
      if (!title || drafts.some((d) => d.id === `admrul:${sid}`)) continue;
      if (titleFilter && !titleFilter.test(title)) continue;
      drafts.push({
        id: `admrul:${sid}`,
        source: 'admrul',
        sourceId: sid,
        title,
        kind: pick(i, ['행정규칙종류']) ?? '행정규칙',
        agency: pick(i, ['소관부처명']) ?? '',
        url: seq ? admrulSeqUrl(seq) : admrulUrl(title),
        level: 'L1A_ADMRULE',
        promulgatedAt: isoDate(pick(i, ['발령일자'])),
        effectiveAt: isoDate(pick(i, ['시행일자'])),
        revisionType: pick(i, ['제개정구분명']),
      });
    }
  }

  // 3) 자치법규 — 묶음별 검색어(자치법규명), 제1조(목적) 파싱용 본문 조회
  for (const [bundle, def] of Object.entries(cfg.overrides.ordinance_bundles) as [OrdinanceBundle, (typeof cfg.overrides.ordinance_bundles)['redcross']][]) {
    for (const q of def.queries) {
      const items = await guarded(`ordin:${q}`, failed, async () => (await search({ target: 'ordin', query: q }, api)).items, []);
      for (const i of items) {
        const mst = pick(i, ['자치법규일련번호', 'MST']) ?? '';
        const id = `ordin:${pick(i, ['자치법규ID']) ?? mst}`;
        if (drafts.some((d) => d.id === id)) continue;
        const title = pick(i, ['자치법규명']) ?? '';
        let purpose: string | undefined;
        let bodyText = '';
        const detail = await service('ordin', mst, api, 'MST').catch(() => null);
        if (detail) {
          const units = ((detail['조문'] as Json | undefined)?.['조'] ?? (detail['조문'] as Json | undefined)?.['조문단위']) as Json[] | Json | undefined;
          const list = Array.isArray(units) ? units : units ? [units] : [];
          bodyText = list.map((u) => stripTags(pick(u, ['조내용', '조문내용'])) ?? '').join('\n');
          purpose = stripTags(pick(list[0], ['조내용', '조문내용']));
        } else if (def.requireBody) {
          failed.push(`ordin:${q}`);
          continue;
        }
        if (def.requireBody && !/적십자/.test(`${title}\n${bodyText}`)) continue;
        drafts.push({
          id,
          source: 'ordin',
          sourceId: pick(i, ['자치법규ID']) ?? mst,
          title,
          kind: pick(i, ['자치법규종류']) ?? '조례',
          agency: pick(i, ['지자체기관명']) ?? '',
          url: mst ? ordinSeqUrl(mst) : ordinUrl(title),
          bundle,
          purpose,
          promulgatedAt: isoDate(pick(i, ['공포일자'])),
          effectiveAt: isoDate(pick(i, ['시행일자'])),
          revisionType: pick(i, ['제개정구분명']),
        });
      }
    }
  }

  // 4) 조약 — 1949년 제네바협약(제1~4협약)·추가의정서 (정정·선언·개정·유보 문서 제외)
  const treaties = await guarded('trty:제네바', failed, async () => (await search({ target: 'trty', query: '제네바' }, api)).items, []);
  for (const i of treaties) {
    const title = pick(i, ['조약명', '조약명한글']) ?? '';
    if (!/1949년 8월 12일자 제네바협약/.test(title) || /정정|선언|개정|유보/.test(title)) continue;
    const seq = pick(i, ['조약일련번호']) ?? '';
    drafts.push({
      id: `trty:${seq}`,
      source: 'trty',
      sourceId: seq,
      title,
      kind: '조약',
      agency: '외교부',
      url: trtySeqUrl(seq),
      level: 'L0_TREATY',
      field: 'INT',
      isCore: true,
      effectiveAt: isoDate(pick(i, ['발효일자'])),
    });
  }

  // 5) 공공기관 정관·규정 (target=pi). 응답은 행정규칙 형식 필드를 쓴다.
  //    같은 규정의 개정본이 '현행'으로 2건 이상 오는 경우가 있어, 시행일이 오늘 이전인 것 중 가장 최근 본만 남긴다.
  const piTarget = cfg.overrides.pi_target ?? 'pi';
  const pi = await guarded(`pi:${cfg.overrides.pi_agency}`, failed, async () => search({ target: piTarget, query: cfg.overrides.pi_agency }, api), null);
  let piTotal: number | null = null;
  if (pi) {
    piTotal = pi.totalCnt;
    const own = pi.items.filter((i) => (pick(i, ['소관부처명', '기관명']) ?? '').includes(cfg.overrides.pi_agency));
    const latest = new Map<string, Json>();
    for (const i of own) {
      const title = pick(i, ['행정규칙명', '규정명']) ?? '';
      const eff = pick(i, ['시행일자']) ?? '';
      const cur = latest.get(title);
      const curEff = cur ? (pick(cur, ['시행일자']) ?? '') : '';
      const ok = (d: string) => d <= today.replace(/-/g, '');
      if (!cur || (ok(eff) && (!ok(curEff) || eff > curEff)) || (!ok(eff) && !ok(curEff) && eff < curEff)) latest.set(title, i);
    }
    for (const [title, i] of latest) {
      const link = pick(i, ['행정규칙상세링크', '상세링크']) ?? '';
      const seq = link.match(/[?&]ID=(\d+)/)?.[1] ?? pick(i, ['행정규칙일련번호']) ?? '';
      const sid = pick(i, ['행정규칙ID']) ?? seq;
      drafts.push({
        id: `pi:${sid}`,
        source: 'pi',
        sourceId: sid,
        title,
        kind: /정관$/.test(title) ? '정관' : /(시행규칙|세칙)$/.test(title) ? '시행규칙' : /(지침|요령)$/.test(title) ? '지침' : '규정',
        agency: cfg.overrides.pi_agency,
        url: piSeqUrl(seq),
        promulgatedAt: isoDate(pick(i, ['발령일자', '공포일자'])),
        effectiveAt: isoDate(pick(i, ['시행일자'])),
        revisionType: pick(i, ['제개정구분명']),
      });
    }
  }

  return { drafts, piTotal, failed };
}
