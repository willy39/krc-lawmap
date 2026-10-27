import { describe, expect, it } from 'vitest';
import { inToc, unitsFromBlocks, unitsFromRows, unitText } from '../../src/lib/bookUnits.ts';

describe('unitsFromRows', () => {
  it('장 제목과 조문 머리를 나눈다', () => {
    const u = unitsFromRows([
      ['', '', '제1장 총칙'],
      ['제1조', '목적', '제1조(목적) 이 규정은 …'],
    ]);
    expect(u[0]).toEqual({ k: 'h', lv: 1, x: '제1장 총칙' });
    expect(u[1]).toEqual({ k: 'art', head: '제1조(목적)', x: '이 규정은 …', no: '제1조' });
  });
});

describe('unitsFromBlocks', () => {
  it('한 문단에 이어 붙은 조문을 조문마다 나눈다', () => {
    const u = unitsFromBlocks([{ t: 'p', x: '제1조(목적) 가.\n\n제2조(정의) ① 나.\n1. 다.' }]);
    expect(u).toEqual([
      { k: 'art', head: '제1조(목적)', x: '가.' },
      { k: 'art', head: '제2조(정의)', x: '① 나.\n1. 다.' },
    ]);
  });
  it('조문 머리가 없는 문단·표·그림은 그대로 둔다', () => {
    const u = unitsFromBlocks([
      { t: 'p', x: '1. 본 규정의 목적' },
      { t: 'table', caption: '표 3-1 공통사항', rows: [[{ x: '일련번호', h: 1 }]] },
      { t: 'img', src: 'book-images/a.jpg', caption: '그림 1' },
    ]);
    expect(u.map((x) => x.k)).toEqual(['p', 'table', 'img']);
    expect(unitText(u[1])).toContain('일련번호');
    expect(u.filter(inToc).length).toBe(2);
  });
  it("괄호 없이 '제1조 제목' 한 줄로 쓴 조문도 조문으로 본다", () => {
    const u = unitsFromBlocks([{ t: 'p', x: '제1조 표장의 목적\n① 표장의 보호적 사용이라 함은 …' }]);
    expect(u[0]).toEqual({ k: 'art', head: '제1조 표장의 목적', x: '① 표장의 보호적 사용이라 함은 …' });
  });
  it('본문 속 "제3조에 따라" 같은 인용은 조문 머리로 보지 않는다', () => {
    const u = unitsFromBlocks([{ t: 'p', x: '제3조에 따라 정한다.' }]);
    expect(u[0].k).toBe('p');
  });
});

describe('법규집 뷰어 본문 파싱', async () => {
  const { parseContent } = await import('../../scripts/collect/krcBook.ts');
  it('장 제목·문단·표·그림을 블록으로 바꾼다', () => {
    const html = `<html><body><div id="content">
      <h1 class="element heading1"><div class="r_heading_inner"><span class="heading1_n">제 1 장</span>총칙</div></h1>
      <pre class="element pre">제1조(목적) 이 규칙은<br>목적으로 한다.</pre>
      <div class="element table"><table><caption><span class="table_caption_n">표 3-1</span>공통사항</caption>
        <tr><th>번호</th><th colspan="2">사무내용</th></tr><tr><td rowspan="2"><p>1</p></td><td><p>가.</p><p>나.</p></td><td>회장</td></tr></table></div>
      <div class="element image"><p class="caption"><span class="image_caption_n">그림 3-1</span>행정조치001</p><p class="content"><img src="/r/book_image/get/63240e9d0377d479?1" width="794" height="1123"></p></div>
    </div></body></html>`;
    const r = parseContent(html)!;
    expect(r.blocks[0]).toEqual({ t: 'h', lv: 1, x: '제 1 장 총칙' });
    expect(r.blocks[1]).toEqual({ t: 'p', x: '제1조(목적) 이 규칙은\n목적으로 한다.' });
    expect(r.blocks[2]).toMatchObject({ t: 'table', caption: '표 3-1 공통사항' });
    const t = r.blocks[2] as { rows: { x: string; h?: 1; cs?: number; rs?: number }[][] };
    expect(t.rows[0][1]).toEqual({ x: '사무내용', h: 1, cs: 2 });
    expect(t.rows[1][0]).toEqual({ x: '1', rs: 2 });
    expect(t.rows[1][1].x).toBe('가.\n나.');
    expect(r.blocks[3]).toEqual({ t: 'img', src: 'book-images/63240e9d0377d479.jpg', w: 794, h: 1123, caption: '그림 3-1 행정조치001' });
    expect(r.images).toEqual([{ id: '63240e9d0377d479', src: '/r/book_image/get/63240e9d0377d479?1' }]);
  });
  it('본문 영역이 없는 응답(오류 화면 등)은 null — 자료 없음으로 확정하지 않는다', () => {
    expect(parseContent('<html><body>점검 중</body></html>')).toBeNull();
  });
});
