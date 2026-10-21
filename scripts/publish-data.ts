// data/build 의 공개 산출물을 public/data 로 복사 (클라이언트 지연 로딩·⌘K 검색용). review-queue 는 공개하지 않는다.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BUILD, ROOT } from './lib/config.ts';

const out = join(ROOT, 'public', 'data');
mkdirSync(out, { recursive: true });
for (const f of ['norms.json', 'cases.json', 'relations.json', 'regions.json', 'meta.json', 'changes.json', 'fulltext.json']) {
  if (existsSync(join(BUILD, f))) copyFileSync(join(BUILD, f), join(out, f));
}
console.log('✓ public/data 갱신');
