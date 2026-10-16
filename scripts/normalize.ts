// 판례·해석 초안 정규화: 요지 절단(≤600자), 참조조문 파싱, 링크에서 OC 제거 (설계서 4.2, 4.5)
import type { CaseDraft } from './lib/drafts.ts';
import { parseCitations, type Citation } from './lib/citation.ts';
import { mask } from './lib/lawApi.ts';

export const SUMMARY_MAX = 600;

export function truncateSummary(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t.length <= SUMMARY_MAX ? t : `${t.slice(0, SUMMARY_MAX - 1)}…`;
}

export interface NormalizedCase extends CaseDraft {
  citations: Citation[];
}

export function normalizeCase(d: CaseDraft): NormalizedCase {
  // 참조조문 필드가 없으면 요지 속 「」 인용으로 보조 파싱
  let citations = parseCitations(d.citedRaw);
  if (citations.length === 0 && d.summary) {
    const quoted = [...d.summary.matchAll(/「([^」]+)」\s*(제\s*\d+\s*조(?:\s*의\s*\d+)?)?/g)].map((m) => `${m[1]} ${m[2] ?? ''}`);
    citations = parseCitations(quoted.join(', '));
  }
  return {
    ...d,
    title: d.title.trim(),
    summary: truncateSummary(d.summary),
    url: mask(d.url).replace(/[?&]OC=\*\*\*/g, ''),
    citations,
  };
}
