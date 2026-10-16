// P0 실측 (설계서 10.1): 각 target 의 응답 구조·필드명·totalCnt·상세링크 형식을 data/raw 에 저장하고 요약 출력
//   LAW_OC=... npm run probe
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA } from './lib/config.ts';
import { mask, search } from './lib/lawApi.ts';

const oc = process.env.LAW_OC;
if (!oc) {
  console.error('LAW_OC 가 필요합니다.');
  process.exit(1);
}
const dir = join(DATA, 'raw', 'probe');
mkdirSync(dir, { recursive: true });

const probes: { target: string; query: string; search?: 1 | 2 }[] = [
  { target: 'law', query: '대한적십자사 조직법' },
  { target: 'eflaw', query: '혈액관리법' },
  { target: 'admrul', query: '적십자' },
  { target: 'ordin', query: '적십자' },
  { target: 'ordin', query: '헌혈' },
  { target: 'trty', query: '제네바' },
  { target: 'pi', query: '대한적십자사' },
  { target: 'prec', query: '대한적십자사', search: 1 },
  { target: 'prec', query: '대한적십자사', search: 2 },
  { target: 'detc', query: '적십자' },
  { target: 'expc', query: '대한적십자사' },
  { target: 'decc', query: '대한적십자사' },
  // 중앙부처 1차 해석 — 후보 target 명 (가이드 확인 후 overrides.yaml cgm_targets 에 등록)
  { target: 'mohwCgmExpc', query: '혈액' },
  { target: 'moisCgmExpc', query: '적십자' },
  { target: 'moelCgmExpc', query: '적십자' },
];

const lines = ['| target | query | search | totalCnt | 첫 항목 필드 |', '|---|---|---|---|---|'];
for (const p of probes) {
  try {
    const r = await search({ ...p }, { oc, onRaw: (k, b) => writeFileSync(join(dir, `${k.replace(/[^\w가-힣.-]+/g, '_')}.json`), mask(b)) });
    const fields = r.items[0] ? Object.keys(r.items[0]).join(', ') : '(없음)';
    lines.push(`| ${p.target} | ${p.query} | ${p.search ?? ''} | ${r.totalCnt} | ${fields} |`);
  } catch (e) {
    lines.push(`| ${p.target} | ${p.query} | ${p.search ?? ''} | 실패 | ${mask(e instanceof Error ? e.message : String(e))} |`);
  }
}
console.log(lines.join('\n'));
console.log('\n→ 결과를 docs/api-probe.md 에 기록하세요.');
