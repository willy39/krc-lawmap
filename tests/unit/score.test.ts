import { describe, expect, it } from 'vitest';
import { isVisible, relevanceScore, reviewStatus, type RelevanceConfig } from '../../scripts/lib/score.ts';

const cfg: RelevanceConfig = {
  weights: { citesOrgAct: 50, titleHasOrg: 40, partyIsOrg: 40, citesCurated: 25, bodyMention: 10 },
  threshold: { auto: 70, candidate: 40 },
  orgKeywords: ['대한적십자사', '적십자사', '적십자병원', '혈액원'],
  orgActNames: ['대한적십자사 조직법', '대한적십자사 조직법 시행령'],
};
const curated = ['혈액관리법', '재해구호법'];

describe('relevanceScore', () => {
  it('조직법 인용 + 제목 기관명 = 90', () => {
    expect(relevanceScore({ title: '대한적십자사 회비 사건', citedLaws: [{ lawName: '대한적십자사 조직법', article: '제8조' }], curatedLawNames: curated }, cfg)).toBe(90);
  });
  it('상한 100', () => {
    expect(
      relevanceScore({ title: '혈액원 사건', party: '피고 대한적십자사', citedLaws: [{ lawName: '대한적십자사조직법' }, { lawName: '혈액관리법' }], curatedLawNames: curated }, cfg),
    ).toBe(100);
  });
  it('큐레이션 법률만 인용 = 25 (수집 제외)', () => {
    const s = relevanceScore({ title: '수혈 사건', citedLaws: [{ lawName: '혈액관리법' }], curatedLawNames: curated }, cfg);
    expect(s).toBe(25);
    expect(reviewStatus(s, cfg)).toBeNull();
  });
  it('본문에만 기관명 = 10 (다른 신호가 있으면 가산 안 함)', () => {
    expect(relevanceScore({ title: '손해배상', body: '대한적십자사에 기부', citedLaws: [], curatedLawNames: curated }, cfg)).toBe(10);
    expect(relevanceScore({ title: '대한적십자사', body: '대한적십자사', citedLaws: [], curatedLawNames: curated }, cfg)).toBe(40);
  });
  it('조직법 시행령 띄어쓰기 변형도 인식', () => {
    expect(relevanceScore({ title: 'x', citedLaws: [{ lawName: '대한적십자사조직법 시행령' }], curatedLawNames: [] }, cfg)).toBe(50);
  });
});

describe('reviewStatus', () => {
  it('임계값', () => {
    expect(reviewStatus(70, cfg)).toBe('auto');
    expect(reviewStatus(69, cfg)).toBe('candidate');
    expect(reviewStatus(40, cfg)).toBe('candidate');
    expect(reviewStatus(39, cfg)).toBeNull();
  });
  it('검수 기록 우선', () => {
    expect(reviewStatus(100, cfg, 'rejected')).toBe('rejected');
    expect(reviewStatus(10, cfg, 'approved')).toBe('approved');
  });
  it('rejected·candidate 는 비노출', () => {
    expect(isVisible('rejected')).toBe(false);
    expect(isVisible('candidate')).toBe(false);
    expect(isVisible('auto')).toBe(true);
    expect(isVisible('approved')).toBe(true);
  });
});
