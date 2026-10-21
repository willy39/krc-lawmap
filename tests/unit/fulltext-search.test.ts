import { describe, expect, it } from 'vitest';
import { contentRegex, highlightParts, matchCounts, searchText } from '../../src/lib/fulltextSearch.ts';
import type { FullText } from '../../src/types/model.ts';

const ft: FullText = {
  'pi:1': [
    ['', '', '제1장 총칙'],
    ['제1조', '목적', '제1조(목적) 이 규정은 헌혈 증서의 발급에 관한 사항을 정한다.'],
    ['제5조', '재발급', '제5조(재발급) 헌혈증서를 잃어버린 경우 다시 발급할 수 있다.'],
  ],
  'law:x': [['제2조', '정의', '제2조(정의) "혈액"이란 인체에서 채혈한 혈구 및 혈장을 말한다.']],
};

describe('조문 내용 검색', () => {
  it('띄어쓰기 무시', () => {
    expect(contentRegex('헌혈증서')!.test('헌혈 증서')).toBe(true);
    expect(contentRegex('헌혈 증서')!.test('헌혈증서')).toBe(true);
  });
  it('한 글자는 검색하지 않음', () => expect(contentRegex('혈')).toBeNull());
  it('조문 단위 결과·개수', () => {
    const r = searchText('헌혈증서', ft);
    expect(r.total).toBe(2);
    expect(r.norms).toBe(1);
    expect(r.hits[0].row[0]).toBe('제1조');
    expect(r.hits[0].match).toBe('헌혈 증서');
  });
  it('특수문자 이스케이프', () => expect(searchText('"혈액"', ft).total).toBe(1));
  it('규범별 일치 수', () => expect(matchCounts('발급', ft).get('pi:1')).toBe(2));
  it('강조 조각', () => {
    expect(highlightParts('가 헌혈 증서 나 헌혈증서', '헌혈증서').filter((p) => p.hit).map((p) => p.t)).toEqual(['헌혈 증서', '헌혈증서']);
  });
});

import { formatArticle } from '../../src/lib/fulltextSearch.ts';
describe('formatArticle', () => {
  it('항·호 앞 줄바꿈, 날짜 보존', () => {
    const t = formatArticle('제2조(선발) ① 회장은 선발한다. 1. 징계처분을 받은 직원2. 근속기간이 짧은 직원② 추천할 수 있다. [본조신설 2019. 4. 1.]');
    expect(t).toBe('제2조(선발)\n① 회장은 선발한다.\n1. 징계처분을 받은 직원\n2. 근속기간이 짧은 직원\n② 추천할 수 있다. [본조신설 2019. 4. 1.]');
  });
});
