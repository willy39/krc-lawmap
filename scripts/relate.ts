// 규범 ↔ 해석 연결 (설계서 3.6): 참조조문 자동(CITES) + review.yaml about(ABOUT)
import type { CaseItem, NormItem, Relation } from '../src/types/model.ts';
import type { Config } from './lib/config.ts';
import { normalizeLawName } from './lib/citation.ts';
import { isVisible } from './lib/score.ts';

export function relate(norms: NormItem[], cases: CaseItem[], cfg: Config): Relation[] {
  const byName = new Map<string, string>();
  for (const n of norms) {
    if (n.source === 'law' || n.source === 'admrul' || n.source === 'ordin' || n.source === 'pi') {
      byName.set(normalizeLawName(n.title), n.id);
      if (n.shortTitle) byName.set(normalizeLawName(`대한적십자사 ${n.shortTitle}`), n.id);
    }
  }
  const normIds = new Set(norms.map((n) => n.id));
  const rels: Relation[] = [];
  const key = (r: Relation) => `${r.from}|${r.to}|${r.article ?? ''}`;
  const seen = new Set<string>();
  const add = (r: Relation) => {
    if (seen.has(key(r))) return;
    seen.add(key(r));
    rels.push(r);
  };

  for (const c of cases) {
    for (const cl of c.citedLaws) {
      const id = byName.get(normalizeLawName(cl.lawName));
      if (!id) continue;
      cl.normId = id;
      add({ from: c.id, to: id, article: cl.article, type: 'CITES' });
    }
    for (const about of cfg.review[c.id]?.about ?? []) {
      const [to, article] = about.split('#');
      if (!normIds.has(to)) {
        console.warn(`  ⚠ review.yaml ${c.id}.about: 규범 ${to} 없음`);
        continue;
      }
      add({ from: c.id, to, article, type: 'ABOUT' });
    }
  }

  // 나무 배지(⚖ N): 노출 대상 판례·해석 수
  const visible = new Set(cases.filter((c) => isVisible(c.review)).map((c) => c.id));
  for (const n of norms) {
    n.caseCount = new Set(rels.filter((r) => r.to === n.id && visible.has(r.from)).map((r) => r.from)).size;
  }
  return rels;
}
