import { describe, expect, it } from 'vitest';
import { normalizeLawName, parseCitations, parsePurposeParents } from '../../scripts/lib/citation.ts';

const cases: [string, { lawName: string; article?: string }[]][] = [
  ['대한적십자사 조직법 제8조', [{ lawName: '대한적십자사 조직법', article: '제8조' }]],
  ['「대한적십자사 조직법」 제8조', [{ lawName: '대한적십자사 조직법', article: '제8조' }]],
  ['혈액관리법 제12조 제1항', [{ lawName: '혈액관리법', article: '제12조' }]],
  ['혈액관리법 제12조의2', [{ lawName: '혈액관리법', article: '제12조의2' }]],
  ['혈액관리법 제12조의 2', [{ lawName: '혈액관리법', article: '제12조의2' }]],
  ['혈액관리법 제 12 조', [{ lawName: '혈액관리법', article: '제12조' }]],
  ['민법 제750조, 제751조', [{ lawName: '민법', article: '제750조' }, { lawName: '민법', article: '제751조' }]],
  ['혈액관리법 제2조·제7조', [{ lawName: '혈액관리법', article: '제2조' }, { lawName: '혈액관리법', article: '제7조' }]],
  ['혈액관리법 제2조ㆍ제7조', [{ lawName: '혈액관리법', article: '제2조' }, { lawName: '혈액관리법', article: '제7조' }]],
  ['혈액관리법 제2조 및 제7조', [{ lawName: '혈액관리법', article: '제2조' }, { lawName: '혈액관리법', article: '제7조' }]],
  ['혈액관리법 제8조, 같은 법 시행규칙 제2조', [{ lawName: '혈액관리법', article: '제8조' }, { lawName: '혈액관리법 시행규칙', article: '제2조' }]],
  ['대한적십자사 조직법 제8조, 같은 법 시행령 제3조', [{ lawName: '대한적십자사 조직법', article: '제8조' }, { lawName: '대한적십자사 조직법 시행령', article: '제3조' }]],
  ['혈액관리법 시행령 제5조, 같은 법 시행규칙 제3조', [{ lawName: '혈액관리법 시행령', article: '제5조' }, { lawName: '혈액관리법 시행규칙', article: '제3조' }]],
  ['재해구호법 제2조, 같은 법 제29조', [{ lawName: '재해구호법', article: '제2조' }, { lawName: '재해구호법', article: '제29조' }]],
  ['재해구호법 제2조, 동법 제29조', [{ lawName: '재해구호법', article: '제2조' }, { lawName: '재해구호법', article: '제29조' }]],
  ['구 혈액관리법(2012. 2. 1. 법률 제11264호로 개정되기 전의 것) 제12조', [{ lawName: '혈액관리법', article: '제12조' }]],
  ['구 혈액관리법(2012. 2. 1. 법률 제11264호로 개정되기 전의 것) 제12조 제1항, 제2항', [{ lawName: '혈액관리법', article: '제12조' }]],
  ['[1] 민법 제750조 / [2] 혈액관리법 제2조', [{ lawName: '민법', article: '제750조' }, { lawName: '혈액관리법', article: '제2조' }]],
  ['[1] 민법 제750조<br/>[2] 혈액관리법 제2조', [{ lawName: '민법', article: '제750조' }, { lawName: '혈액관리법', article: '제2조' }]],
  ['대한민국헌법 제10조, 제37조 제2항', [{ lawName: '대한민국헌법', article: '제10조' }, { lawName: '대한민국헌법', article: '제37조' }]],
  ['헌법 제37조 제2항', [{ lawName: '헌법', article: '제37조' }]],
  ['공공기관의 운영에 관한 법률 제4조', [{ lawName: '공공기관의 운영에 관한 법률', article: '제4조' }]],
  ['재난 및 안전관리 기본법 제3조', [{ lawName: '재난 및 안전관리 기본법', article: '제3조' }]],
  ['기부금품의 모집 및 사용에 관한 법률 제2조 제1호', [{ lawName: '기부금품의 모집 및 사용에 관한 법률', article: '제2조' }]],
  ['근로기준법 제23조 제1항, 제27조', [{ lawName: '근로기준법', article: '제23조' }, { lawName: '근로기준법', article: '제27조' }]],
  ['혈액관리법', [{ lawName: '혈액관리법' }]],
  ['혈액관리법, 대한적십자사 조직법 제8조', [{ lawName: '혈액관리법' }, { lawName: '대한적십자사 조직법', article: '제8조' }]],
  ['', []],
  ['참조조문 없음', []],
  ['대한적십자사조직법 제1조', [{ lawName: '대한적십자사조직법', article: '제1조' }]],
  ['민법 제750조 제1항 제2호', [{ lawName: '민법', article: '제750조' }]],
  ['형법 제347조 제1항, 혈액관리법 제14조', [{ lawName: '형법', article: '제347조' }, { lawName: '혈액관리법', article: '제14조' }]],
  ['혈액관리법 제6조 내지 제8조', [{ lawName: '혈액관리법', article: '제6조' }, { lawName: '혈액관리법', article: '제8조' }]],
  ['민법 제750조, 민법 제750조', [{ lawName: '민법', article: '제750조' }]],
  ['「혈액관리법」 제2조, 「같은 법 시행령」 제3조', [{ lawName: '혈액관리법', article: '제2조' }, { lawName: '혈액관리법 시행령', article: '제3조' }]],
];

describe('parseCitations', () => {
  it.each(cases)('%s', (input, expected) => {
    expect(parseCitations(input)).toEqual(expected);
  });
  it('null 안전', () => {
    expect(parseCitations(null)).toEqual([]);
    expect(parseCitations(undefined)).toEqual([]);
  });
});

describe('normalizeLawName', () => {
  it('공백·「」 제거로 띄어쓰기 변형 동일시', () => {
    expect(normalizeLawName('대한적십자사 조직법')).toBe(normalizeLawName('「대한적십자사조직법」'));
  });
});

describe('parsePurposeParents', () => {
  it('제1조 「」 인용 추출', () => {
    expect(parsePurposeParents('이 조례는 「대한적십자사 조직법」 및 「혈액관리법」에 따라 …')).toEqual(['대한적십자사 조직법', '혈액관리법']);
  });
  it('인용 없음', () => {
    expect(parsePurposeParents('이 조례는 주민 복리 증진을 목적으로 한다.')).toEqual([]);
  });
});
