// 법규집 읽기 팝업의 본문 단위 — 국가법령정보센터 조문(fulltext.json)과 법규집 본문 블록(book-text.json)을 같은 꼴로 바꾼다
import type { ArticleRow, BookBlock, BookCell } from '@/types/model';

export type Unit =
  | { k: 'h'; lv: number; x: string }
  | { k: 'art'; head: string; x: string; /** law.go.kr 조문번호(조문별 원문 링크용) */ no?: string }
  | { k: 'p'; x: string }
  | { k: 'table'; caption?: string; rows: BookCell[][] }
  | { k: 'img'; src: string; w?: number; h?: number; caption?: string };

const ART_HEAD = /^(제\s*\d+\s*조(?:\s*의\s*\d+)?\s*(?:\([^)]*\))?)\s*/;
const ART_START = /\n(?=제\s*\d+\s*조(?:\s*의\s*\d+)?\s*\()/;
/** 법규집 문서 일부는 '제1조 표장의 목적' 처럼 괄호 없이 제목을 한 줄로 쓴다(뒤에 줄바꿈) */
const ART_LINE = /^(제\s*\d+\s*조(?:\s*의\s*\d+)?\s+[^\n]{1,40})\n/;

/** fulltext.json 의 조문 행 → 단위 */
export function unitsFromRows(rows: ArticleRow[]): Unit[] {
  return rows.map((r): Unit => {
    if (!r[0]) return { k: 'h', lv: 1, x: r[2].trim() };
    const text = r[2].trim();
    const m = text.match(ART_HEAD);
    return m ? { k: 'art', head: m[1], x: text.slice(m[0].length), no: r[0] } : { k: 'art', head: `${r[0]}${r[1] ? `(${r[1]})` : ''}`, x: text, no: r[0] };
  });
}

/** 법규집 본문 블록 → 단위. 한 문단에 여러 조문이 이어 붙어 있으면 조문마다 나눈다 */
export function unitsFromBlocks(blocks: BookBlock[]): Unit[] {
  const out: Unit[] = [];
  for (const b of blocks) {
    if (b.t === 'h') out.push({ k: 'h', lv: b.lv, x: b.x });
    else if (b.t === 'table') out.push({ k: 'table', caption: b.caption, rows: b.rows });
    else if (b.t === 'img') out.push({ k: 'img', src: b.src, w: b.w, h: b.h, caption: b.caption });
    else
      for (const piece of b.x.split(ART_START)) {
        const x = piece.trim();
        if (!x) continue;
        const m = x.match(ART_HEAD);
        const line = x.match(ART_LINE);
        if (m && /\(/.test(m[1])) out.push({ k: 'art', head: m[1], x: x.slice(m[0].length) });
        else if (line) out.push({ k: 'art', head: line[1].trim(), x: x.slice(line[0].length) });
        else out.push({ k: 'p', x });
      }
  }
  return out;
}

/** 본문 찾기용 텍스트 */
export function unitText(u: Unit): string {
  if (u.k === 'art') return `${u.head} ${u.x}`;
  if (u.k === 'table') return [u.caption ?? '', ...u.rows.flat().map((c) => c.x)].join(' ');
  if (u.k === 'img') return u.caption ?? '';
  return u.x;
}

/** 목차에 넣을 단위(장·절 제목, 조문, 제목 있는 표·그림) */
export const inToc = (u: Unit) => u.k === 'h' || u.k === 'art' || ((u.k === 'table' || u.k === 'img') && !!u.caption);
