// 법규집 연계 법령만 따로 갱신: LAW_OC=... node --import tsx scripts/book-laws.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUILD, loadConfig } from './lib/config.ts';
import { collectBookLaws } from './collect/bookLaws.ts';

const oc = process.env.LAW_OC;
if (!oc) {
  console.error('LAW_OC 가 필요합니다.');
  process.exit(1);
}
const laws = await collectBookLaws(loadConfig(), { oc });
writeFileSync(join(BUILD, 'book-laws.json'), `${JSON.stringify(laws, null, 1)}\n`);
console.log(`✓ 법규집 연계 법령 ${laws.length}건`, laws.map((l) => `${l.name}(시행 ${l.effectiveAt})`).join(', '));
