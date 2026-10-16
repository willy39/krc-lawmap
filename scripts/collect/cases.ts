// 해석·적용 축 수집: prec · detc · expc · cgm · decc (설계서 3.4 ①, 4.1)
// 목록은 매번 전체 재조회, 본문은 신규·변경 건만 조회(증분, 4.4)
import type { CaseSource } from '../../src/types/model.ts';
import { caseUrl } from '../../src/lib/links.ts';
import type { Config } from '../lib/config.ts';
import { isoDate, stripTags, type CaseDraft } from '../lib/drafts.ts';
import { pick, search, service, type LawApiOptions } from '../lib/lawApi.ts';

type Json = Record<string, unknown>;

export interface CaseDetailCache {
  [id: string]: { hash: string; summary?: string; citedRaw?: string; party?: string; body?: string; outcome?: string };
}

interface TargetDef {
  source: CaseSource;
  target: string;
  issuer?: string;
  queries: { query: string; search?: 1 | 2 }[];
  list: { id: string[]; docNo: string[]; title: string[]; date: string[]; issuer?: string[]; party?: string[]; outcome?: string[]; link: string[] };
  detail: { summary: string[]; cited: string[]; body: string[]; outcome?: string[] };
}

const ORG_QUERIES = ['대한적십자사', '적십자사', '적십자병원', '혈액원', '대한적십자사 조직법'];

// P0 실측: 모든 유형에서 제목 검색(search=1)은 거의 0건이고 본문 검색(search=2)으로 후보가 모인다.
function targets(cfg: Config): TargetDef[] {
  const body = ORG_QUERIES.map((query) => ({ query, search: 2 as const }));
  const defs: TargetDef[] = [
    {
      source: 'prec', target: 'prec', queries: body,
      list: { id: ['판례일련번호'], docNo: ['사건번호'], title: ['사건명'], date: ['선고일자'], issuer: ['법원명', '데이터출처명'], outcome: ['판결유형'], link: ['판례상세링크'] },
      detail: { summary: ['판시사항', '판결요지'], cited: ['참조조문'], body: ['판례내용'] },
    },
    {
      source: 'detc', target: 'detc', issuer: '헌법재판소', queries: body,
      list: { id: ['헌재결정례일련번호'], docNo: ['사건번호'], title: ['사건명'], date: ['종국일자', '선고일자'], link: ['헌재결정례상세링크'] },
      detail: { summary: ['판시사항', '결정요지'], cited: ['참조조문', '심판대상조문'], body: ['전문'] },
    },
    {
      source: 'expc', target: 'expc', issuer: '법제처', queries: body,
      list: { id: ['법령해석례일련번호'], docNo: ['안건번호'], title: ['안건명'], date: ['회신일자', '해석일자'], party: ['질의기관명'], link: ['법령해석례상세링크'] },
      detail: { summary: ['질의요지', '회답'], cited: ['참조조문', '관련법령'], body: ['이유'] },
    },
    {
      source: 'decc', target: 'decc', issuer: '중앙행정심판위원회', queries: body,
      list: { id: ['행정심판재결례일련번호', '행정심판례일련번호'], docNo: ['사건번호'], title: ['사건명'], date: ['의결일자', '재결일자'], issuer: ['재결청'], party: ['처분청'], outcome: ['재결구분명'], link: ['행정심판례상세링크'] },
      detail: { summary: ['재결요지', '주문'], cited: ['참조조문', '관련법령'], body: ['이유', '청구취지'] },
    },
  ];
  for (const c of cfg.overrides.cgm_targets ?? []) {
    defs.push({
      source: 'cgm', target: c.target, issuer: c.ministry, queries: body,
      list: { id: ['법령해석일련번호'], docNo: ['안건번호'], title: ['안건명'], date: ['해석일자', '회신일자'], issuer: ['해석기관명'], party: ['질의기관명'], link: ['법령해석상세링크'] },
      detail: { summary: ['질의요지', '회답'], cited: ['관련법령', '참조조문'], body: ['이유'] },
    });
  }
  return defs;
}

export interface CaseCollectResult {
  drafts: CaseDraft[];
  cache: CaseDetailCache;
  failed: CaseSource[];
}

export async function collectCases(cfg: Config, api: LawApiOptions, prevCache: CaseDetailCache): Promise<CaseCollectResult> {
  const drafts = new Map<string, CaseDraft>();
  const cache: CaseDetailCache = {};
  const failed = new Set<CaseSource>();

  for (const def of targets(cfg)) {
    for (const q of def.queries) {
      let items: Json[] = [];
      try {
        items = (await search({ target: def.target, query: q.query, search: q.search }, api)).items;
      } catch (e) {
        console.error(`  ✗ ${def.target}/${q.query}: ${e instanceof Error ? e.message : e}`);
        failed.add(def.source);
        continue;
      }
      for (const i of items) {
        const sid = pick(i, def.list.id);
        if (!sid) continue;
        const id = `${def.source}:${sid}`;
        if (drafts.has(id)) continue;
        const docNo = pick(i, def.list.docNo) ?? '';
        const decidedAt = isoDate(pick(i, def.list.date)) ?? '';
        const hash = `${docNo}|${decidedAt}`;
        let det = prevCache[id]?.hash === hash ? prevCache[id] : undefined;
        if (!det) {
          try {
            const d = await service(def.target, sid, api);
            const summary = def.detail.summary.map((k) => stripTags(pick(d, [k]))).filter(Boolean).join('\n\n');
            const body = stripTags(pick(d, def.detail.body));
            det = {
              hash,
              summary: summary || undefined,
              citedRaw: stripTags(pick(d, def.detail.cited)),
              party: body?.slice(0, 400),
              body: body?.slice(0, 2000),
            };
          } catch (e) {
            console.error(`  ✗ ${id} 본문: ${e instanceof Error ? e.message : e}`);
            det = prevCache[id] ?? { hash: '' }; // 실패 시 이전 본문 유지, 다음 회차 재시도
          }
        }
        cache[id] = det;
        const title = pick(i, def.list.title) ?? '';
        drafts.set(id, {
          id,
          source: def.source,
          sourceId: sid,
          docNo,
          title,
          issuer: (def.list.issuer && pick(i, def.list.issuer)) || def.issuer || '',
          decidedAt,
          outcome: def.list.outcome ? pick(i, def.list.outcome) : undefined,
          summary: det.summary,
          citedRaw: det.citedRaw,
          party: [def.list.party ? pick(i, def.list.party) : '', det.party].filter(Boolean).join(' '),
          body: det.body,
          url: caseUrl(def.source, sid) ?? '',
        });
      }
    }
  }
  return { drafts: [...drafts.values()], cache, failed: [...failed] };
}
