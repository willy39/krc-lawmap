import { describe, expect, it } from 'vitest';
import { lawRows, ordinRows, piRows, splitArticle } from '../../scripts/lib/fulltext.ts';

describe('splitArticle', () => {
  it('조문번호·제목', () => expect(splitArticle('제1조(목적) 이 법은 …')).toEqual(['제1조', '목적', '제1조(목적) 이 법은 …']));
  it('가지조문', () => expect(splitArticle('제12조의2(헌혈자 보호) …')[0]).toBe('제12조의2'));
  it('장 제목', () => expect(splitArticle('제1장 총칙')).toEqual(['', '', '제1장 총칙']));
  it('태그 제거', () => expect(splitArticle('제2조(정의)<br/>1. "혈액"이란')[2]).toBe('제2조(정의)\n1. "혈액"이란'));
});

describe('lawRows', () => {
  it('항·호·목을 이어 붙임', () => {
    const rows = lawRows({
      조문: {
        조문단위: [
          { 조문여부: '전문', 조문내용: '제1장 총칙' },
          { 조문여부: '조문', 조문제목: '정의', 조문내용: '제2조(정의) 이 법에서 사용하는 용어의 뜻은 다음과 같다.', 항: { 호: [{ 호내용: '1. "혈액"이란 …', 목: [{ 목내용: '가. 혈구' }] }, { 호내용: '2. "헌혈자"란 …' }] } },
          { 조문여부: '조문', 조문내용: '제3조(책무)', 항: [{ 항내용: '① 국가는 …' }, { 항내용: '② 지방자치단체는 …' }] },
        ],
      },
    });
    expect(rows[0]).toEqual(['', '', '제1장 총칙']);
    expect(rows[1][0]).toBe('제2조');
    expect(rows[1][2]).toContain('가. 혈구');
    expect(rows[2][2]).toBe('제3조(책무)\n① 국가는 …\n② 지방자치단체는 …');
  });
});

describe('piRows / ordinRows', () => {
  it('기관규정 문자열 배열', () => {
    expect(piRows({ 조문내용: ['제1장 총칙', '제1조(목적) 이 운영규정은 …'] }).map((r) => r[0])).toEqual(['', '제1조']);
  });
  it('조례 조[]', () => {
    const rows = ordinRows({ 조문: { 조: [{ 조제목: '목적', 조내용: '제1조(목적) 이 조례는 …' }, { 조내용: '' }] } });
    expect(rows).toEqual([['제1조', '목적', '제1조(목적) 이 조례는 …']]);
  });
});
