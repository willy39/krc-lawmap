// 통합검색 (설계서 7.9) — 두 축을 한 번에 검색. 규모(수백~수천 건)상 클라이언트 n-gram 매칭으로 충분.
import type { CaseItem, FieldCode, NormItem } from '@/types/model';
import { FIELD_NAMES } from './labels';

export type SearchHit =
  | { group: '법령' | '기관규정' | '조례'; norm: NormItem; score: number }
  | { group: '판례·해석'; c: CaseItem; score: number }
  | { group: '분야'; field: FieldCode; score: number };

const norm = (s: string) => s.toLowerCase().replace(/[\s·ㆍ「」()\-]/g, '');

/** 사건번호(2019다12345)·안건번호(23-0456) 패턴 */
export const DOCNO_RE = /^\s*(\d{2,4}\s*[가-힣]{1,3}\s*\d{1,6}|\d{2}-\d{3,4})\s*$/;

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  if (s.length === 1) out.add(s);
  return out;
}

function matchScore(hay: string, terms: string[]): number {
  const h = norm(hay);
  let best = 0;
  for (const t of terms) {
    if (!t) continue;
    if (h === t) best = Math.max(best, 100);
    else if (h.startsWith(t)) best = Math.max(best, 80);
    else if (h.includes(t)) best = Math.max(best, 60);
    else {
      const qb = bigrams(t);
      const hb = bigrams(h);
      let hit = 0;
      for (const b of qb) if (hb.has(b)) hit++;
      const r = qb.size ? hit / qb.size : 0;
      if (r >= 0.6) best = Math.max(best, Math.round(r * 40));
    }
  }
  return best;
}

export function expandQuery(q: string, aliases: string[][]): string[] {
  const n = norm(q);
  const terms = new Set([n]);
  for (const group of aliases) {
    if (group.some((a) => n.includes(norm(a)))) {
      for (const a of group) terms.add(n.replace(norm(group.find((g) => n.includes(norm(g)))!), norm(a)));
    }
  }
  return [...terms];
}

export function searchAll(q: string, norms: NormItem[], cases: CaseItem[], aliases: string[][]): SearchHit[] {
  if (!q.trim()) return [];
  const terms = expandQuery(q, aliases);
  const hits: SearchHit[] = [];
  const isDocNo = DOCNO_RE.test(q);

  for (const n of norms) {
    const s = Math.max(matchScore(n.title, terms), matchScore(n.agency, terms) * 0.5);
    if (s > 0) hits.push({ group: n.source === 'pi' ? '기관규정' : n.source === 'ordin' ? '조례' : '법령', norm: n, score: s + (n.isCore ? 5 : 0) });
  }
  for (const c of cases) {
    let s = Math.max(matchScore(c.title, terms), matchScore(c.docNo, terms), ...c.issueTags.map((t) => matchScore(t, terms) * 0.9));
    if (isDocNo && norm(c.docNo).includes(norm(q))) s = 1000;
    if (s > 0) hits.push({ group: '판례·해석', c, score: s });
  }
  for (const [code, name] of Object.entries(FIELD_NAMES) as [FieldCode, string][]) {
    const s = matchScore(name, terms);
    if (s >= 60) hits.push({ group: '분야', field: code, score: s });
  }
  return hits.sort((a, b) => b.score - a.score);
}
