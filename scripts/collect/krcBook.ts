// 법규집에만 있는 항목(V 기타규칙 · VI 유관법령조문 및 행정조치 · VII 폐지규정)의 본문 — 대한적십자사 법규집 뷰어(law.redcross.or.kr)
// - 빌드타임에만 수집한다(런타임 호출 없음). 화면에는 링크를 내지 않고 본문만 법규집 읽기 팝업에 보인다.
// - 문서마다 3회 재시도, 응답에 본문 영역(#content)이 없으면 실패로 보고 직전 스냅샷을 유지한다.
// - 그림(행정조치 공문 스캔 등)은 data/build/book-images/ 로 내려받아 서비스에 내장한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { parse, type HTMLElement } from 'node-html-parser';
import type { BookBlock, BookCell, BookText } from '../../src/types/model.ts';
import { BUILD, DATA, readJson } from '../lib/config.ts';

const ORIGIN = 'http://law.redcross.or.kr';
const HEADERS = {
  Referer: `${ORIGIN}/law`,
  'User-Agent': 'krc-lawmap-build (+https://github.com/willy39/krc-lawmap)',
  Accept: 'text/html,image/*;q=0.9,*/*;q=0.8',
};
const DELAY_MS = 300;
const RETRIES = 3;
const TIMEOUT_MS = 30_000;
/** 수집 대상: law.go.kr 과 연결하는 I~IV 를 뺀 나머지 편 */
const LINKED_PARTS = new Set(['법령', '정관', '운영규정', '시행규칙']);
export const BOOK_IMAGES = join(BUILD, 'book-images');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function get(url: string, check: (res: Response) => Promise<Buffer | string>): Promise<Buffer | string> {
  let last: unknown;
  for (let i = 0; i < RETRIES; i++) {
    try {
      await sleep(DELAY_MS * (i + 1) ** 2);
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await check(res);
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

const clean = (s: string) =>
  s
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** 번호 span(제 1 장 등)과 제목 사이에 띄어쓰기를 넣는다 */
function withNumber(el: HTMLElement, numSel: string): string {
  const n = el.querySelector(numSel)?.text.trim() ?? '';
  const all = clean(el.text);
  return n && all.startsWith(n) ? clean(`${n} ${all.slice(n.length)}`) : all;
}

function cellText(td: HTMLElement): string {
  const ps = td.querySelectorAll('p');
  return clean(ps.length ? ps.map((p) => p.text).join('\n') : td.text);
}

/** 뷰어 본문 HTML → 블록. 그림은 내려받을 원본 주소를 함께 돌려준다 */
export function parseContent(html: string): { blocks: BookBlock[]; images: { id: string; src: string }[] } | null {
  const root = parse(html.replace(/<br\s*\/?>/gi, '\n'));
  const content = root.querySelector('#content');
  if (!content) return null;
  const blocks: BookBlock[] = [];
  const images: { id: string; src: string }[] = [];
  for (const el of content.childNodes as HTMLElement[]) {
    if (el.nodeType !== 1) continue;
    const cls = el.classList;
    const heading = [...cls.values()].map((c) => c.match(/^heading(\d)$/)?.[1]).find(Boolean);
    if (heading) {
      const x = withNumber(el, `.heading${heading}_n`);
      if (x) blocks.push({ t: 'h', lv: Number(heading), x });
    } else if (cls.contains('table') || el.tagName === 'TABLE') {
      const table = el.tagName === 'TABLE' ? el : el.querySelector('table');
      if (!table) continue;
      const rows: BookCell[][] = table.querySelectorAll('tr').map((tr) =>
        tr.querySelectorAll('th,td').map((c) => {
          const cell: BookCell = { x: cellText(c) };
          if (c.tagName === 'TH') cell.h = 1;
          const cs = Number(c.getAttribute('colspan') ?? 1);
          const rs = Number(c.getAttribute('rowspan') ?? 1);
          if (cs > 1) cell.cs = cs;
          if (rs > 1) cell.rs = rs;
          return cell;
        }),
      );
      const caption = table.querySelector('caption') ?? el.querySelector('caption');
      if (rows.length) blocks.push({ t: 'table', caption: caption ? withNumber(caption, '[class$="_n"]') || undefined : undefined, rows });
    } else if (cls.contains('image')) {
      const img = el.querySelector('img');
      const src = img?.getAttribute('src');
      const id = src?.match(/book_image\/get\/([0-9a-f]+)/)?.[1];
      if (!img || !src || !id) continue;
      const cap = el.querySelector('.caption');
      images.push({ id, src });
      blocks.push({
        t: 'img',
        src: `book-images/${id}.jpg`,
        w: Number(img.getAttribute('width')) || undefined,
        h: Number(img.getAttribute('height')) || undefined,
        caption: cap ? withNumber(cap, '.image_caption_n') || undefined : undefined,
      });
    } else {
      const x = clean(el.text);
      if (x) blocks.push({ t: 'p', x });
    }
  }
  return { blocks, images };
}

interface Entry {
  title: string;
  url: string;
}

function bookEntries(): { book: string; entries: { id: string; title: string }[] } {
  const y = YAML.parse(readFileSync(join(DATA, 'krc-order.yaml'), 'utf8')) as { viewerBook: string; parts: { title: string; items: Entry[] }[] };
  const entries = y.parts
    .filter((p) => !LINKED_PARTS.has(p.title))
    .flatMap((p) => p.items)
    .map((e) => ({ id: e.url?.split('/').pop() ?? '', title: e.title }))
    .filter((e) => /^[0-9a-f]{16}$/.test(e.id));
  return { book: y.viewerBook, entries };
}

export async function collectKrcBook(): Promise<{ text: BookText; failed: string[] }> {
  const prev = readJson<BookText>(join(BUILD, 'book-text.json'), {});
  const { book, entries } = bookEntries();
  mkdirSync(BOOK_IMAGES, { recursive: true });
  const text: BookText = {};
  const failed: string[] = [];
  for (const e of entries) {
    try {
      const html = (await get(`${ORIGIN}/r/viewer/content/${book}/${e.id}`, async (res) => {
        const t = await res.text();
        if (!t.includes('id="content"')) throw new Error('본문 영역 없음(HTML 형식 다름)');
        return t;
      })) as string;
      const parsed = parseContent(html);
      if (!parsed) throw new Error('본문 영역 없음');
      for (const img of parsed.images) {
        const file = join(BOOK_IMAGES, `${img.id}.jpg`);
        if (existsSync(file)) continue;
        const buf = (await get(new URL(img.src, ORIGIN).href, async (res) => {
          if (!/^image\/jpe?g/.test(res.headers.get('content-type') ?? '')) throw new Error(`그림 형식 ${res.headers.get('content-type')}`);
          return Buffer.from(await res.arrayBuffer());
        })) as Buffer;
        writeFileSync(file, buf);
      }
      // 본문이 비어 있는데 직전에는 있었다면 일시 오류로 보고 직전 값을 쓴다
      const p = prev[e.id];
      text[e.id] = !parsed.blocks.length && p?.blocks.length ? p : { title: e.title, blocks: parsed.blocks, fetchedAt: today() };
    } catch (err) {
      failed.push(e.title);
      console.error(`  ✗ 법규집 본문 ${e.title}: ${err instanceof Error ? err.message : err}${prev[e.id] ? ' → 직전 값 유지' : ''}`);
      if (prev[e.id]) text[e.id] = prev[e.id];
    }
  }
  return { text, failed };
}
