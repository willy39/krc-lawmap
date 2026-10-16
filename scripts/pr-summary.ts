// 주간 수집 PR 본문: 규범 diff · 신규 판례/해석 · 검수 대기 목록 요약 (설계서 10.1 P9)
import { join } from 'node:path';
import type { CaseItem, ChangeSet, DatasetMeta } from '../src/types/model.ts';
import { BUILD, readJson } from './lib/config.ts';

const meta = readJson<DatasetMeta>(join(BUILD, 'meta.json'), null as never);
const changes = readJson<ChangeSet>(join(BUILD, 'changes.json'), { entries: [] } as never);
const queue = readJson<CaseItem[]>(join(BUILD, 'review-queue.json'), []);

const by = (k: string) => changes.entries.filter((e) => e.kind === k);
const lines = [
  `## 데이터 갱신 — 기준일 ${meta.baseDate}`,
  '',
  `- 규범 ${meta.counts.norms.total}건 (기관규정 ${meta.counts.norms.pi} / API ${meta.apiTotalCnt.pi ?? '-'}) · 판례·해석 노출 ${meta.counts.cases.total}건 · 검수 대기 ${meta.counts.cases.candidate}건`,
  `- 깨진 링크 ${meta.brokenLinks}건 · 확인 불가 ${meta.unverifiedLinks}건`,
  '',
  '### 규범 변경',
  ...[...by('NORM_ADDED').map((e) => `- 추가: ${e.title}`), ...by('NORM_REVISED').map((e) => `- 개정: ${e.title} (${e.date ?? ''})`), ...by('NORM_REMOVED').map((e) => `- 폐지/누락: ${e.title}`)],
  '',
  '### 신규 판례·해석',
  ...by('CASE_ADDED').map((e) => `- ${e.title} — ${e.detail ?? ''} ${e.date ?? ''}`),
  '',
  `### 검수 대기 (candidate) ${queue.length}건 — data/review.yaml 에 approved/rejected 기록`,
  ...queue.slice(0, 50).map((c) => `- [ ] \`${c.id}\` ${c.title} (${c.docNo}, 관련도 ${c.relevance}) ${c.url}`),
];
console.log(lines.join('\n'));
