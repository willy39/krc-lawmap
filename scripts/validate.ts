// 산출물 검증: zod 스키마, 중복 ID, 노출 규칙, 요지 길이, URL의 OC 노출, 링크 검사, 스냅샷 diff (설계서 4.5, 12장)
import { z } from 'zod';
import type { CaseItem, ChangeEntry, ChangeSet, NormItem, Relation } from '../src/types/model.ts';
import { FIELD_CODES } from '../src/types/model.ts';
import { SUMMARY_MAX } from './normalize.ts';

const Field = z.enum(FIELD_CODES);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const NormSchema = z.object({
  id: z.string().min(3),
  source: z.enum(['law', 'eflaw', 'admrul', 'ordin', 'trty', 'pi']),
  sourceId: z.string(),
  title: z.string().min(1),
  kind: z.string().min(1),
  level: z.string(),
  primaryField: Field,
  secondaryFields: z.array(Field),
  parentId: z.string().nullable(),
  agency: z.string(),
  effectiveAt: isoDate.optional(),
  promulgatedAt: isoDate.optional(),
  url: z.string().url(),
  isCore: z.boolean(),
  caseCount: z.number().int().nonnegative(),
  flags: z.array(z.enum(['RECENT', 'UPCOMING', 'NO_PARENT', 'LINK_BROKEN'])),
});

export const CaseSchema = z.object({
  id: z.string().min(3),
  source: z.enum(['prec', 'detc', 'expc', 'cgm', 'pre', 'decc']),
  docNo: z.string(),
  title: z.string().min(1),
  issuer: z.string(),
  decidedAt: z.union([isoDate, z.literal('')]),
  summary: z.string().max(SUMMARY_MAX).optional(),
  fields: z.array(Field),
  relevance: z.number().min(0).max(100),
  review: z.enum(['auto', 'approved']),
  url: z.string().url(),
});

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

export function validate(norms: NormItem[], visibleCases: CaseItem[], relations: Relation[], allCases: CaseItem[]): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dup = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

  for (const n of norms) {
    const r = NormSchema.safeParse(n);
    if (!r.success) errors.push(`norm ${n.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  for (const c of visibleCases) {
    const r = CaseSchema.safeParse(c);
    if (!r.success) errors.push(`case ${c.id}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  for (const d of dup(norms.map((n) => n.id))) errors.push(`중복 규범 ID: ${d}`);
  for (const d of dup(visibleCases.map((c) => c.id))) errors.push(`중복 판례·해석 ID: ${d}`);

  const rejected = new Set(allCases.filter((c) => c.review === 'rejected').map((c) => c.id));
  for (const c of visibleCases) if (rejected.has(c.id)) errors.push(`rejected 항목 노출: ${c.id}`);

  const normIds = new Set(norms.map((n) => n.id));
  for (const r of relations) if (!normIds.has(r.to)) errors.push(`연결 대상 규범 없음: ${r.from} → ${r.to}`);
  for (const n of norms) if (n.parentId && !normIds.has(n.parentId)) errors.push(`부모 규범 없음: ${n.id} → ${n.parentId}`);

  for (const u of [...norms.map((n) => n.url), ...visibleCases.map((c) => c.url)]) {
    if (/[?&]OC=/i.test(u)) errors.push(`URL에 OC 포함: ${u}`);
  }

  const ord = norms.filter((n) => n.source === 'ordin');
  const noRegion = ord.filter((n) => !n.region);
  if (noRegion.length) warnings.push(`시·도 메타 없는 조례 ${noRegion.length}건: ${noRegion.slice(0, 5).map((n) => n.title).join(', ')}`);
  const noParent = ord.filter((n) => !n.parentId).length;
  if (ord.length) warnings.push(`조례 부모 미지정 비율 ${((noParent / ord.length) * 100).toFixed(1)}% (${noParent}/${ord.length})`);
  return { errors, warnings };
}

/** 링크 검사 (동시성 4, 지연 300ms). 안티봇 응답은 '확인 불가'로 별도 집계 */
export async function checkLinks(urls: string[]): Promise<{ broken: string[]; unverified: string[] }> {
  const broken: string[] = [];
  const unverified: string[] = [];
  const queue = [...new Set(urls)];
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await fetch(u, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.law.go.kr/' } });
        const text = res.ok ? await res.text() : '';
        if (res.status === 404 || res.status === 410) broken.push(u);
        else if (!res.ok || /자동입력|captcha|robot/i.test(text.slice(0, 3000))) unverified.push(u);
      } catch {
        unverified.push(u);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { broken, unverified };
}

export function diffSnapshots(
  prev: { norms: NormItem[]; cases: CaseItem[]; generatedAt: string | null },
  next: { norms: NormItem[]; cases: CaseItem[]; generatedAt: string },
): ChangeSet {
  const entries: ChangeEntry[] = [];
  const pn = new Map(prev.norms.map((n) => [n.id, n]));
  const nn = new Map(next.norms.map((n) => [n.id, n]));
  for (const n of next.norms) {
    const p = pn.get(n.id);
    if (!p) entries.push({ kind: 'NORM_ADDED', id: n.id, title: n.title, date: n.effectiveAt, detail: n.kind });
    else if ((p.effectiveAt ?? '') !== (n.effectiveAt ?? '') || (p.promulgatedAt ?? '') !== (n.promulgatedAt ?? '')) {
      entries.push({ kind: 'NORM_REVISED', id: n.id, title: n.title, date: n.effectiveAt, detail: n.revisionType });
    }
  }
  for (const p of prev.norms) if (!nn.has(p.id)) entries.push({ kind: 'NORM_REMOVED', id: p.id, title: p.title, date: p.effectiveAt });
  const pc = new Set(prev.cases.map((c) => c.id));
  for (const c of next.cases) if (!pc.has(c.id)) entries.push({ kind: 'CASE_ADDED', id: c.id, title: c.title, date: c.decidedAt, detail: c.issuer });
  entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return { generatedAt: next.generatedAt, previousGeneratedAt: prev.generatedAt, entries };
}
