// 조문 본문 파서 — 법령(law)·기관규정(pi)·자치법규(ordin) 상세 응답 → ArticleRow[]
import type { ArticleRow } from '../../src/types/model.ts';
import { stripTags } from './drafts.ts';

type Json = Record<string, unknown>;
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : v && typeof v === 'object' ? [v as Json] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ') : '');
const clean = (s: string) => (stripTags(s) ?? '').replace(/[ \t]+\n/g, '\n').trim();

/** "제3조의2(목적) 본문…" → ["제3조의2", "목적", "제3조의2(목적) 본문…"] / 장·절 제목 → ["", "", "제1장 총칙"] */
export function splitArticle(text: string, titleHint = ''): ArticleRow {
  const t = clean(text);
  const m = t.match(/^제\s*(\d+)\s*조(?:\s*의\s*(\d+))?\s*(?:\(([^)]*)\))?/);
  if (!m) return ['', titleHint, t];
  return [`제${m[1]}조${m[2] ? `의${m[2]}` : ''}`, m[3] ?? titleHint, t];
}

/** 법령 상세(lawService target=law) — 조문단위 + 항·호·목을 순서대로 이어 붙인다 */
export function lawRows(detail: Json): ArticleRow[] {
  const units = arr((detail['조문'] as Json | undefined)?.['조문단위']);
  return units.map((u) => {
    const parts = [str(u['조문내용'])];
    for (const hang of arr(u['항'])) {
      parts.push(str(hang['항내용']));
      for (const ho of arr(hang['호'])) {
        parts.push(str(ho['호내용']));
        for (const mok of arr(ho['목'])) parts.push(str(mok['목내용']));
      }
    }
    const body = parts.filter(Boolean).join('\n');
    if (str(u['조문여부']) === '전문') return ['', '', clean(body)] as ArticleRow;
    return splitArticle(body, str(u['조문제목']));
  });
}

/** 기관규정 상세(lawService target=pi) — 조문내용은 문자열 배열 */
export function piRows(detail: Json): ArticleRow[] {
  const c = detail['조문내용'];
  const list = (Array.isArray(c) ? c : c ? [c] : []).map((a) => (typeof a === 'string' ? a : str((a as Json)['조문내용'])));
  return list.filter((s) => s.trim()).map((s) => splitArticle(s));
}

/** 자치법규 상세(lawService target=ordin) — 조문.조[] 의 조내용 */
export function ordinRows(detail: Json): ArticleRow[] {
  const box = detail['조문'] as Json | undefined;
  const list = arr(box?.['조'] ?? box?.['조문단위']);
  return list
    .map((u) => ({ text: str(u['조내용'] ?? u['조문내용']), title: str(u['조제목'] ?? u['조문제목']) }))
    .filter((u) => u.text.trim())
    .map((u) => splitArticle(u.text, u.title));
}
