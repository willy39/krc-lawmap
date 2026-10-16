// 판례·해석 관련성 점수 (설계서 3.4 ②·③)
import type { ReviewStatus } from '../../src/types/model.ts';
import { normalizeLawName, type Citation } from './citation.ts';

export interface RelevanceConfig {
  weights: { citesOrgAct: number; titleHasOrg: number; partyIsOrg: number; citesCurated: number; bodyMention: number };
  threshold: { auto: number; candidate: number };
  orgKeywords: string[];
  orgActNames: string[];
}

export interface RelevanceInput {
  title: string;
  party?: string; // 당사자·질의기관
  body?: string; // 요지·본문 일부
  citedLaws: Citation[];
  curatedLawNames: string[];
}

export function relevanceScore(input: RelevanceInput, cfg: RelevanceConfig): number {
  const w = cfg.weights;
  const cited = input.citedLaws.map((c) => normalizeLawName(c.lawName));
  const orgActs = cfg.orgActNames.map(normalizeLawName);
  const curated = input.curatedLawNames.map(normalizeLawName);
  const hasOrg = (s?: string) => !!s && cfg.orgKeywords.some((k) => s.includes(k));

  let score = 0;
  if (cited.some((c) => orgActs.includes(c))) score += w.citesOrgAct;
  if (hasOrg(input.title)) score += w.titleHasOrg;
  if (hasOrg(input.party)) score += w.partyIsOrg;
  if (cited.some((c) => curated.includes(c))) score += w.citesCurated;
  if (score === 0 && hasOrg(input.body)) score += w.bodyMention;
  return Math.min(100, score);
}

/** 점수 → 검수 상태. 검수 파일(review.yaml) 지정이 항상 우선. null = 수집 제외(임계 미만) */
export function reviewStatus(
  score: number,
  cfg: RelevanceConfig,
  manual?: ReviewStatus,
): ReviewStatus | null {
  if (manual === 'approved' || manual === 'rejected') return manual;
  if (score >= cfg.threshold.auto) return 'auto';
  if (score >= cfg.threshold.candidate) return 'candidate';
  return null;
}

/** 서비스 노출 여부: rejected 는 어떤 경우에도 비노출 */
export function isVisible(status: ReviewStatus): boolean {
  return status === 'auto' || status === 'approved';
}
