import { describe, expect, it } from 'vitest';
import { ordinanceParent } from '../../scripts/lib/classify.ts';

const laws = [
  { id: 'law:대한적십자사 조직법', title: '대한적십자사 조직법' },
  { id: 'law:혈액관리법', title: '혈액관리법' },
  { id: 'law:재해구호법', title: '재해구호법' },
];
const defaults = { redcross: '대한적십자사 조직법', blood: '혈액관리법', disaster: '재해구호법', family: null };

describe('ordinanceParent', () => {
  it('제1조 「」 인용 우선', () => {
    expect(ordinanceParent('이 조례는 「혈액관리법」에 따라 …', 'redcross', laws, defaults)).toBe('law:혈액관리법');
  });
  it('띄어쓰기 변형 인용', () => {
    expect(ordinanceParent('「대한적십자사조직법」에 따라', 'blood', laws, defaults)).toBe('law:대한적십자사 조직법');
  });
  it('인용이 큐레이션 밖이면 묶음 기본 부모', () => {
    expect(ordinanceParent('「지방자치법」 제28조에 따라', 'blood', laws, defaults)).toBe('law:혈액관리법');
  });
  it('인용 없음 → 묶음 기본 부모', () => {
    expect(ordinanceParent(undefined, 'disaster', laws, defaults)).toBe('law:재해구호법');
  });
  it('기본 부모 없는 묶음 → null', () => {
    expect(ordinanceParent(undefined, 'family', laws, defaults)).toBeNull();
  });
});
