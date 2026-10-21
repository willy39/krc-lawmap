// 조문 내용 검색 — 띄어쓰기를 무시하고 조문 본문에서 검색어를 찾는다
import type { ArticleRow, FullText } from '@/types/model';

export const MIN_CONTENT_QUERY = 2;

export interface TextHit {
  normId: string;
  row: ArticleRow;
  index: number; // 조문 순번
  before: string;
  match: string;
  after: string;
}

const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "헌혈 증서" → /헌\s*혈\s*증\s*서/ (띄어쓰기 무관) */
export function contentRegex(q: string, flags = ''): RegExp | null {
  const chars = [...q.replace(/\s+/g, '')];
  if (chars.length < MIN_CONTENT_QUERY) return null;
  return new RegExp(chars.map(esc).join('\\s*'), flags);
}

function snippet(text: string, at: number, len: number, pad = 34) {
  const s = Math.max(0, at - pad);
  const e = Math.min(text.length, at + len + pad);
  const flat = (x: string) => x.replace(/\s+/g, ' ');
  return { before: (s > 0 ? '…' : '') + flat(text.slice(s, at)), match: flat(text.slice(at, at + len)), after: flat(text.slice(at + len, e)) + (e < text.length ? '…' : '') };
}

/** 조문 단위 검색 결과 (규범당 최대 perNorm 건, 전체 limit 건) + 전체 일치 조문 수 */
export function searchText(q: string, ft: FullText, opts: { limit?: number; perNorm?: number; ids?: string[] } = {}): { hits: TextHit[]; total: number; norms: number } {
  const re = contentRegex(q);
  if (!re) return { hits: [], total: 0, norms: 0 };
  const limit = opts.limit ?? 50;
  const perNorm = opts.perNorm ?? 3;
  const hits: TextHit[] = [];
  let total = 0;
  let norms = 0;
  for (const id of opts.ids ?? Object.keys(ft)) {
    const rows = ft[id];
    if (!rows) continue;
    let inNorm = 0;
    rows.forEach((row, index) => {
      const m = re.exec(row[2]);
      if (!m) return;
      total++;
      inNorm++;
      if (inNorm <= perNorm && hits.length < limit) hits.push({ normId: id, row, index, ...snippet(row[2], m.index, m[0].length) });
    });
    if (inNorm) norms++;
  }
  return { hits, total, norms };
}

/** 규범별 일치 조문 수 (일람 필터용) */
export function matchCounts(q: string, ft: FullText): Map<string, number> {
  const re = contentRegex(q);
  const out = new Map<string, number>();
  if (!re) return out;
  for (const [id, rows] of Object.entries(ft)) {
    const n = rows.reduce((s, r) => s + (re.test(r[2]) ? 1 : 0), 0);
    if (n) out.set(id, n);
  }
  return out;
}

/** 본문을 검색어 기준으로 [일반, 강조, 일반, …] 조각으로 나눈다 */
export function highlightParts(text: string, q?: string): { t: string; hit: boolean }[] {
  const re = q ? contentRegex(q, 'g') : null;
  if (!re) return [{ t: text, hit: false }];
  const parts: { t: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ t: text.slice(last, m.index), hit: false });
    parts.push({ t: m[0], hit: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), hit: false });
  return parts;
}

/** 화면 표시용 줄바꿈: 항(①②…)과 본문에 붙어 온 호(…직원2. 근속) 앞에서 줄을 바꾼다. 날짜(2019. 4. 1.)는 건드리지 않는다 */
export function formatArticle(text: string): string {
  return text
    .replace(/([^\n\s])\s*([①-⑳])/g, '$1\n$2')
    .replace(/([가-힣)」.])\s?(\d{1,2}\.\s?(?=[가-힣「"'(]))/g, '$1\n$2')
    .replace(/([가-힣)」.])\s?([가-하]\.\s(?=[가-힣「"'(]))/g, '$1\n$2');
}
