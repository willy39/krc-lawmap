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

describe('국제인도법 신호', () => {
  const ihlCfg = { ...cfg, weights: { ...cfg.weights, ihlTopic: 40 }, ihlKeywords: ['국제인도법', '1949년 8월 12일자 제네바'], ihlLawNames: ['국제형사재판소 관할 범죄의 처벌 등에 관한 법률'] };
  it('정밀 표현 → +40', () => {
    expect(relevanceScore({ title: '인도심사청구', body: '국제인도법 위반 범죄', citedLaws: [], curatedLawNames: [] }, ihlCfg)).toBe(40);
  });
  it('IHL 이행 법률 인용 → +40', () => {
    expect(relevanceScore({ title: 'x', citedLaws: [{ lawName: '국제형사재판소 관할 범죄의 처벌 등에 관한 법률', article: '제10조' }], curatedLawNames: [] }, ihlCfg)).toBe(40);
  });
  it('도로교통 제네바협약은 제외', () => {
    expect(relevanceScore({ title: '도로교통법위반(무면허운전)', body: '1949년 도로교통에 관한 제네바협약', citedLaws: [], curatedLawNames: [] }, ihlCfg)).toBe(0);
  });
});

describe('국제인도법 신호 — 검색어 근거', () => {
  const c2 = { ...cfg, weights: { ...cfg.weights, ihlTopic: 40 }, ihlQueries: ['국제인도법'] };
  it('IHL 검색어로 들어온 항목 → +40', () => {
    expect(relevanceScore({ title: '인도심사청구', citedLaws: [], curatedLawNames: [], matchedQueries: ['국제인도법'] }, c2)).toBe(40);
  });
  it('기관명 검색어로만 들어온 항목은 가산 없음', () => {
    expect(relevanceScore({ title: '손해배상', citedLaws: [], curatedLawNames: [], matchedQueries: ['혈액원'] }, c2)).toBe(0);
  });
});
