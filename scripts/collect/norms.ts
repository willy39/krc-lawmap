// 규범 축 수집: law · eflaw · admrul · ordin · trty · pi (설계서 4.1)
import type { NormItem, OrdinanceBundle } from '../../src/types/model.ts';
import { admrulUrl, lawUrl, ordinUrl } from '../../src/lib/links.ts';
import type { Config } from '../lib/config.ts';
import { isoDate, stripTags, type NormDraft } from '../lib/drafts.ts';
import { normalizeLawName } from '../lib/citation.ts';
import { normalizeDetailLink, pick, search, service, type LawApiOptions } from '../lib/lawApi.ts';

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

  // 2) 행정규칙
  for (const q of cfg.overrides.admrul_queries) {
    const items = await guarded(`admrul:${q}`, failed, async () => (await search({ target: 'admrul', query: q }, api)).items, []);
    for (const i of items) {
      const title = pick(i, ['행정규칙명']) ?? '';
      if (!title || drafts.some((d) => d.source === 'admrul' && d.title === title)) continue;
      drafts.push({
        id: `admrul:${pick(i, ['행정규칙ID', '행정규칙일련번호'])}`,
        source: 'admrul',
        sourceId: pick(i, ['행정규칙ID', '행정규칙일련번호']) ?? '',
        title,
        kind: pick(i, ['행정규칙종류']) ?? '행정규칙',
        agency: pick(i, ['소관부처명']) ?? '',
        url: admrulUrl(title),
        level: 'L1A_ADMRULE',
        promulgatedAt: isoDate(pick(i, ['발령일자'])),
        effectiveAt: isoDate(pick(i, ['시행일자'])),
        revisionType: pick(i, ['제개정구분명']),
      });
    }
  }

  // 3) 자치법규 — 묶음별 검색어, 제1조(목적) 파싱용 본문 조회
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
        }
        if (def.requireBody && !/적십자/.test(bodyText)) continue;
        drafts.push({
          id,
          source: 'ordin',
          sourceId: pick(i, ['자치법규ID']) ?? mst,
          title,
          kind: pick(i, ['자치법규종류']) ?? '조례',
          agency: pick(i, ['지자체기관명']) ?? '',
          url: ordinUrl(title),
          bundle,
          purpose,
          promulgatedAt: isoDate(pick(i, ['공포일자'])),
          effectiveAt: isoDate(pick(i, ['시행일자'])),
          revisionType: pick(i, ['제개정구분명']),
        });
      }
    }
  }

  // 4) 조약 — 제네바협약·추가의정서 ⚠️ trty target 실측 필요
  const treaties = await guarded('trty:제네바', failed, async () => (await search({ target: 'trty', query: '제네바' }, api)).items, []);
  for (const i of treaties) {
    const title = pick(i, ['조약명', '조약명한글']) ?? '';
    if (!/제네바/.test(title)) continue;
    drafts.push({
      id: `trty:${pick(i, ['조약일련번호', '조약ID'])}`,
      source: 'trty',
      sourceId: pick(i, ['조약일련번호', '조약ID']) ?? '',
      title,
      kind: '조약',
      agency: '외교부',
      url: normalizeDetailLink(pick(i, ['조약상세링크'])) ?? lawUrl(title),
      level: 'L0_TREATY',
      field: 'INT',
      effectiveAt: isoDate(pick(i, ['발효일자'])),
    });
  }

  // 5) 공공기관 규정 — 기관명 필터 ⚠️ target·필드명 실측 필요
  const piTarget = cfg.overrides.pi_target ?? 'pi';
  const pi = await guarded(`pi:${cfg.overrides.pi_agency}`, failed, async () => search({ target: piTarget, query: cfg.overrides.pi_agency }, api), null);
  let piTotal: number | null = null;
  if (pi) {
    const own = pi.items.filter((i) => (pick(i, ['기관명', '공공기관명', '소관기관명']) ?? cfg.overrides.pi_agency).includes(cfg.overrides.pi_agency));
    piTotal = own.length;
    for (const i of own) {
      const sid = pick(i, ['규정일련번호', '공공기관규정일련번호', '일련번호', 'ID']) ?? '';
      const title = pick(i, ['규정명', '공공기관규정명', '법령명', '제목']) ?? '';
      drafts.push({
        id: `pi:${sid}`,
        source: 'pi',
        sourceId: sid,
        title,
        kind: /정관$/.test(title) ? '정관' : /시행규칙|세칙$/.test(title) ? '시행규칙' : /지침|요령$/.test(title) ? '지침' : '규정',
        agency: cfg.overrides.pi_agency,
        url: normalizeDetailLink(pick(i, ['상세링크', '규정상세링크'])) ?? '',
        promulgatedAt: isoDate(pick(i, ['공포일자', '제정일자'])),
        effectiveAt: isoDate(pick(i, ['시행일자'])),
        revisionType: pick(i, ['제개정구분명', '제개정구분']),
      });
    }
  }

  return { drafts, piTotal, failed };
}
