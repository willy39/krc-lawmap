import { describe, expect, it } from 'vitest';
import { classifyFields, piLevel, piParent, resolveRegion, type FieldDict } from '../../scripts/lib/classify.ts';

const dict = {
  ORG: { name: '', keywords: ['정관', '직제', '위임전결'] },
  HR: { name: '', keywords: ['인사', '복무', '징계'] },
  PAY: { name: '', keywords: ['보수', '수당'] },
  BLD: { name: '', keywords: ['혈액', '헌혈'] },
  INF: { name: '', keywords: ['개인정보'] },
} as unknown as FieldDict;

const sido = [
  { sido: '서울특별시', short: '서울', code: '11' },
  { sido: '경기도', short: '경기', code: '41' },
  { sido: '강원특별자치도', short: '강원', code: '51', aliases: ['강원도'] },
];

describe('classifyFields', () => {
  it('가장 앞선 키워드가 primary', () => {
    expect(classifyFields('인사규정', dict)).toEqual({ primary: 'HR', secondary: [] });
    expect(classifyFields('헌혈자 개인정보 보호', dict)).toEqual({ primary: 'BLD', secondary: ['INF'] });
  });
  it('매칭 없으면 ETC', () => {
    expect(classifyFields('기타 규정', dict).primary).toBe('ETC');
  });
});

describe('piLevel', () => {
  it.each([
    ['대한적십자사 정관', 'L3_ARTICLES'],
    ['인사규정', 'L4_REGULATION'],
    ['인사규정 시행규칙', 'L5_RULE'],
    ['혈액원 운영 시행세칙', 'L5_RULE'],
    ['이산가족 업무처리지침', 'L6_GUIDELINE'],
  ])('%s → %s', (t, l) => expect(piLevel(t)).toBe(l));
});

describe('piParent', () => {
  const pool = [
    { id: 'pi:1', title: '대한적십자사 정관', level: 'L3_ARTICLES' as const },
    { id: 'pi:2', title: '인사규정', level: 'L4_REGULATION' as const },
    { id: 'pi:3', title: '인사규정 시행규칙', level: 'L5_RULE' as const },
    { id: 'pi:4', title: '대한적십자사 보수규정', level: 'L4_REGULATION' as const },
  ];
  it('시행규칙 → 같은 이름 규정', () => expect(piParent(pool[2], pool, 'law:org')).toBe('pi:2'));
  it('규정 → 정관', () => expect(piParent(pool[1], pool, 'law:org')).toBe('pi:1'));
  it('정관 → 조직법', () => expect(piParent(pool[0], pool, 'law:org')).toBe('law:org'));
  it('기관 접두어 무시', () => expect(piParent({ title: '보수규정 시행규칙', level: 'L5_RULE' }, pool, null)).toBe('pi:4'));
});

describe('resolveRegion', () => {
  it('광역', () => expect(resolveRegion('서울특별시', sido)).toEqual({ sido: '서울특별시', code: '11', type: 'sido' }));
  it('기초', () => expect(resolveRegion('경기도 수원시', sido)).toEqual({ sido: '경기도', sigungu: '수원시', code: '41', type: 'sigungu' }));
  it('교육청', () => expect(resolveRegion('서울특별시교육청', sido)?.type).toBe('edu'));
  it('구 명칭 별칭', () => expect(resolveRegion('강원도 춘천시', sido)?.sido).toBe('강원특별자치도'));
  it('미상', () => expect(resolveRegion('알수없음', sido)).toBeUndefined());
});
