// 법규집에만 있는 항목(V~VII) 본문만 따로 갱신: npm run data:book (키 불필요)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILD } from './lib/config.ts';
import { collectKrcBook } from './collect/krcBook.ts';

const { text, failed } = await collectKrcBook();
writeFileSync(join(BUILD, 'book-text.json'), `${JSON.stringify(text)}\n`);
const withBody = Object.values(text).filter((e) => e.blocks.length).length;
console.log(`✓ 법규집 본문 ${Object.keys(text).length}건 (본문 있음 ${withBody}건${failed.length ? `, 실패 ${failed.length}건` : ''})`);
if (failed.length && !Object.keys(text).length) process.exit(1);
