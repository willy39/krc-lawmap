// 전체 데이터 파이프라인 오케스트레이션 (설계서 5장)
//   npm run data            — 법제처 Open API 수집 (LAW_OC 필요)
//   npm run data:seed       — data/seed/ 의 데모 데이터로 동일 파이프라인 실행 (키 없이 화면 확인용)
//   옵션: --check-links     — 원문 링크 검사
//         --initial         — 직전 스냅샷 비교 없이 변경 이력 새로 시작
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import type { CaseItem, CaseSource, DatasetMeta, NormItem, NormSource, Relation } from '../src/types/model.ts';
import { CASE_SOURCES, NORM_SOURCES } from '../src/types/model.ts';
import { BUILD, DATA, loadConfig, readJson, type ReviewEntry } from './lib/config.ts';
import type { CaseDraft, NormDraft } from './lib/drafts.ts';
import { mask } from './lib/lawApi.ts';
import { collectNorms } from './collect/norms.ts';
import { collectCases, type CaseDetailCache } from './collect/cases.ts';
import { classifyNorms } from './classify.ts';
import { normalizeCase } from './normalize.ts';
import { scoreCases } from './score.ts';
import { relate } from './relate.ts';
import { checkLinks, diffSnapshots, validate } from './validate.ts';
import { isVisible } from './lib/score.ts';

const args = new Set(process.argv.slice(2));
const SEED = args.has('--seed');
const CHECK_LINKS = args.has('--check-links');
// 첫 정식 수집 등 직전 스냅샷과의 비교가 의미 없을 때: 변경 이력을 새로 시작한다
const INITIAL = args.has('--initial');

interface State {
  lastRun?: string;
  mode?: string;
  details?: CaseDetailCache;
}

function write(name: string, data: unknown) {
  writeFileSync(join(BUILD, name), `${JSON.stringify(data, null, 1)}\n`);
}

async function main() {
  const cfg = loadConfig();
  mkdirSync(BUILD, { recursive: true });

  const prevNorms = readJson<NormItem[]>(join(BUILD, 'norms.json'), []);
  const prevCases = readJson<CaseItem[]>(join(BUILD, 'cases.json'), []);
  const prevMeta = readJson<DatasetMeta | null>(join(BUILD, 'meta.json'), null);
  const state = readJson<State>(join(DATA, 'state.json'), {});
  const sameMode = !INITIAL && prevMeta?.mode === (SEED ? 'seed' : 'live');

  let normDrafts: NormDraft[];
  let caseDrafts: CaseDraft[];
  let piTotal: number | null = null;
  let detailCache: CaseDetailCache = state.details ?? {};
  let failedNormUnits: string[] = [];
  let failedCaseSources: CaseSource[] = [];

  if (SEED) {
    console.log('▶ 시드(데모) 데이터로 빌드');
    normDrafts = readJson<NormDraft[]>(join(DATA, 'seed', 'norms.json'), []);
    caseDrafts = readJson<CaseDraft[]>(join(DATA, 'seed', 'cases.json'), []);
    const seedReview = join(DATA, 'seed', 'review.yaml');
    if (existsSync(seedReview)) {
      Object.assign(cfg.review, (YAML.parse(readFileSync(seedReview, 'utf8')) ?? {}) as Record<string, ReviewEntry>);
    }
    piTotal = normDrafts.filter((d) => d.source === 'pi').length;
  } else {
    const oc = process.env.LAW_OC;
    if (!oc) {
      console.error('LAW_OC 환경변수가 없습니다. .env 를 설정하거나 `npm run data:seed` 로 데모 데이터를 빌드하세요.');
      process.exit(1);
    }
    const rawDir = join(DATA, 'raw');
    mkdirSync(rawDir, { recursive: true });
    const api = { oc, onRaw: (key: string, body: string) => writeFileSync(join(rawDir, `${key.replace(/[^\w가-힣.-]+/g, '_')}.json`), mask(body)) };

    console.log('▶ 규범 수집');
    const n = await collectNorms(cfg, api);
    normDrafts = n.drafts;
    piTotal = n.piTotal;
    failedNormUnits = n.failed;

    console.log('▶ 판례·해석 수집');
    const c = await collectCases(cfg, api, detailCache);
    caseDrafts = c.drafts;
    detailCache = c.cache;
    failedCaseSources = c.failed;
  }

  // 분류
  let norms = classifyNorms(normDrafts, cfg);

  // 수집 실패 단위는 이전 스냅샷 유지 — 빈 결과를 "자료 없음"으로 확정하지 않는다
  if (failedNormUnits.length && sameMode) {
    const have = new Set(norms.map((x) => x.id));
    const failedSources = new Set(failedNormUnits.map((u) => u.split(':')[0]));
    for (const p of prevNorms) {
      const unitFailed = failedNormUnits.includes(p.id) || (p.source !== 'law' && failedSources.has(p.source));
      if (unitFailed && !have.has(p.id)) norms.push(p);
    }
    console.warn(`  ⚠ 수집 실패 ${failedNormUnits.length}개 단위 → 이전 스냅샷 유지`);
  }

  // 판례·해석: 정규화 → 점수 → 연결
  const scored = scoreCases(caseDrafts.map(normalizeCase), cfg);
  let allCases: CaseItem[] = scored.map(({ citations: _c, ...rest }) => rest);
  if (failedCaseSources.length && sameMode) {
    const have = new Set(allCases.map((c) => c.id));
    allCases.push(...prevCases.filter((p) => failedCaseSources.includes(p.source) && !have.has(p.id)));
    console.warn(`  ⚠ 판례·해석 수집 실패 유형 ${failedCaseSources.join(', ')} → 이전 스냅샷 유지`);
  }
  const relations = relate(norms, allCases, cfg);
  const visible = allCases.filter((c) => isVisible(c.review)).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  const visibleIds = new Set(visible.map((c) => c.id));
  const visibleRelations: Relation[] = relations.filter((r) => visibleIds.has(r.from));
  const queue = allCases.filter((c) => c.review === 'candidate').sort((a, b) => b.relevance - a.relevance);

  // 건수 급감 방어 (-10%)
  if (!SEED && sameMode && prevNorms.length > 0 && norms.length < prevNorms.length * 0.9) {
    console.error(`✗ 규범 건수 급감 (${prevNorms.length} → ${norms.length}). 기존 데이터를 유지하고 중단합니다.`);
    process.exit(2);
  }

  // 링크 검사
  let broken: string[] = [];
  let unverified: string[] = [];
  if (CHECK_LINKS) {
    console.log('▶ 링크 검사');
    ({ broken, unverified } = await checkLinks([...norms.map((x) => x.url), ...visible.map((x) => x.url)]));
    for (const n of norms) if (broken.includes(n.url)) n.flags.push('LINK_BROKEN');
  }

  // 검증
  const report = validate(norms, visible, visibleRelations, allCases);
  report.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  if (report.errors.length) {
    report.errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error(`✗ 검증 실패 ${report.errors.length}건 — 산출물을 쓰지 않습니다.`);
    process.exit(1);
  }

  norms = norms.sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title, 'ko'));
  const now = new Date();
  const count = <S extends string>(sources: S[], items: { source: string }[]) =>
    Object.fromEntries(sources.map((s) => [s, items.filter((i) => i.source === s).length])) as Record<S, number>;
  const meta: DatasetMeta = {
    baseDate: now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    mode: SEED ? 'seed' : 'live',
    counts: {
      norms: { ...count<NormSource>(NORM_SOURCES, norms), total: norms.length },
      cases: { ...count<CaseSource>(CASE_SOURCES, visible), total: visible.length, candidate: queue.length },
    },
    apiTotalCnt: { pi: piTotal },
    brokenLinks: broken.length,
    unverifiedLinks: unverified.length,
    relevance: cfg.relevance.threshold,
  };

  let changes = diffSnapshots(
    { norms: sameMode ? prevNorms : [], cases: sameMode ? prevCases : [], generatedAt: sameMode ? (prevMeta?.generatedAt ?? null) : null },
    { norms, cases: visible, generatedAt: meta.generatedAt },
  );
  if (!sameMode || !prevMeta) {
    // 최초 빌드: 전체가 '추가'로 잡히지 않도록 최근 시행 규범·최근 판례·해석만 남긴다
    const recent = new Set(norms.filter((x) => x.flags.includes('RECENT') || x.flags.includes('UPCOMING')).map((x) => x.id));
    const recentCases = new Set(visible.slice(0, 5).map((c) => c.id));
    changes = { ...changes, entries: changes.entries.filter((e) => recent.has(e.id) || recentCases.has(e.id)) };
  }

  write('norms.json', norms);
  write('cases.json', visible);
  write('relations.json', visibleRelations);
  write('regions.json', cfg.regions.sido.map(({ aliases: _a, ...r }) => r));
  write('meta.json', meta);
  write('changes.json', changes);
  write('review-queue.json', queue);
  if (!SEED) {
    writeFileSync(join(DATA, 'state.json'), `${JSON.stringify({ lastRun: meta.generatedAt, mode: meta.mode, details: detailCache }, null, 1)}\n`);
  }

  console.log(`✓ 규범 ${norms.length}건 · 판례·해석 ${visible.length}건(검수 대기 ${queue.length}) · 연결 ${visibleRelations.length}건 · 변경 ${changes.entries.length}건`);
  if (piTotal !== null) console.log(`  기관규정: API ${piTotal}건 / 표시 ${meta.counts.norms.pi}건`);
}

main().catch((e) => {
  console.error(mask(String(e?.stack ?? e)));
  process.exit(1);
});
