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

describe('piParent — 실측 명명 규칙', () => {
  const pool = [
    { id: 'pi:a', title: '대한적십자사 정관', level: 'L3_ARTICLES' as const },
    { id: 'pi:b', title: '대한적십자사 감사 운영규정', level: 'L4_REGULATION' as const },
    { id: 'pi:c', title: '대한적십자사 감사 시행규칙', level: 'L5_RULE' as const },
    { id: 'pi:d', title: '대한적십자사 보안업무 시행규칙', level: 'L5_RULE' as const },
  ];
  it('○○ 시행규칙 → ○○ 운영규정', () => expect(piParent(pool[2], pool, null)).toBe('pi:b'));
  it('짝 규정 없으면 정관', () => expect(piParent(pool[3], pool, null)).toBe('pi:a'));
});

describe('resolveRegion — 통합·구 명칭', () => {
  const merged = [{ sido: '전남광주통합특별시', short: '전남광주', code: '46', aliases: ['(구)광주광역시', '(구)전라남도', '광주광역시', '전라남도'] }];
  it('통합특별시 하위 시군', () => expect(resolveRegion('전남광주통합특별시 강진군', merged)).toMatchObject({ sido: '전남광주통합특별시', sigungu: '강진군' }));
  it('(구) 광역 명칭', () => expect(resolveRegion('(구)광주광역시', merged)).toMatchObject({ sido: '전남광주통합특별시', type: 'sido' }));
  it('(구) 교육청', () => expect(resolveRegion('(구)광주광역시교육청', merged)?.type).toBe('edu'));
});

describe('piParent — 제1조(목적) 인용', () => {
  const pool = [
    { id: 'pi:a', title: '대한적십자사 정관', level: 'L3_ARTICLES' as const },
    { id: 'pi:r', title: '대한적십자사 직원 운영규정', level: 'L4_REGULATION' as const },
    { id: 'pi:x', title: '대한적십자사 인사관리 시행규칙', level: 'L5_RULE' as const },
  ];
  it('「직원 운영규정」에서 위임 → 직원 운영규정', () =>
    expect(piParent(pool[2], pool, null, '제1조(목적) 본 시행규칙은 「직원 운영규정」에서 위임된 사항…')).toBe('pi:r'));
  it('「대한적십자사 정관」 인용 → 정관', () => expect(piParent(pool[1], pool, null, '「대한적십자사 정관」 제30조에 따라')).toBe('pi:a'));
  it('인용 없으면 명명 규칙·정관', () => expect(piParent(pool[2], pool, null, '제1조(목적) 이 시행규칙은 민원사무를…')).toBe('pi:a'));
});
