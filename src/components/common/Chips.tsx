'use client';
import Link from 'next/link';
import type { CaseItem, FieldCode, NormItem } from '@/types/model';
import { CASE_LABELS, FAMILY, FIELD_NAMES, familyOf, type Family } from '@/lib/labels';
import { useStore } from '@/lib/store';

const FAMILY_CLASS: Record<Family, string> = {
  law: 'bg-law-bg text-law border-law/30',
  local: 'bg-local-bg text-local border-local/30',
  inst: 'bg-inst-bg text-inst border-inst/30',
  case: 'bg-case-bg text-case border-case/30',
};

export function FamilyChip({ family, label }: { family: Family; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${FAMILY_CLASS[family]}`}>
      <span aria-hidden>{FAMILY[family].icon}</span>
      {label}
    </span>
  );
}

export function KindChip({ norm }: { norm: Pick<NormItem, 'source' | 'kind'> }) {
  return <FamilyChip family={familyOf(norm)} label={norm.kind} />;
}

export function CaseTypeChip({ c }: { c: Pick<CaseItem, 'source'> }) {
  const l = CASE_LABELS[c.source];
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${FAMILY_CLASS.case}`}>
      <span aria-hidden>{l.icon}</span>
      {l.name}
    </span>
  );
}

export function FieldChip({ code, link = true }: { code: FieldCode; link?: boolean }) {
  const cls = 'inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted whitespace-nowrap';
  return link ? (
    <Link href={`/field/${code}/`} className={`${cls} hover:underline`}>
      {FIELD_NAMES[code]}
    </Link>
  ) : (
    <span className={cls}>{FIELD_NAMES[code]}</span>
  );
}

export function StatusBadges({ norm }: { norm: NormItem }) {
  return (
    <>
      {norm.flags.includes('RECENT') && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold text-accent">최근 개정</span>}
      {norm.flags.includes('UPCOMING') && <span className="rounded bg-law-bg px-1.5 py-0.5 text-xs font-semibold text-law">시행 예정</span>}
      {norm.flags.includes('NO_PARENT') && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">상위 미지정</span>}
      {norm.flags.includes('LINK_BROKEN') && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-accent">링크 확인 필요</span>}
      {norm.demo && <DemoTag />}
    </>
  );
}

export function DemoTag() {
  return (
    <span className="rounded border border-dashed border-muted px-1.5 py-0.5 text-[11px] text-muted" title="데모용 예시 데이터">
      예시
    </span>
  );
}

export function ReviewTag({ c }: { c: Pick<CaseItem, 'review'> }) {
  return c.review === 'auto' ? (
    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted" title="관련성 점수로 자동 분류된 항목 (담당자 미검수)">
      자동분류
    </span>
  ) : null;
}

/** ⚖ N 배지 — 클릭 시 상세 패널의 "관련 판례·해석" 탭 */
export function CaseBadge({ norm, className = '' }: { norm: Pick<NormItem, 'id' | 'caseCount'>; className?: string }) {
  const { openDetail } = useStore();
  if (!norm.caseCount) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openDetail(norm.id, { tab: 'cases' });
      }}
      className={`tnum inline-flex items-center gap-0.5 rounded-full border border-case/40 bg-case-bg px-2 py-0.5 text-xs font-semibold text-case hover:border-case ${className}`}
      aria-label={`관련 판례·해석 ${norm.caseCount}건 보기`}
    >
      <span aria-hidden>⚖</span> {norm.caseCount}
    </button>
  );
}

export function ExtLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`ext hover:underline ${className}`}>
      {children}
    </a>
  );
}

export function Relevance({ value }: { value: number }) {
  const dots = Math.round(value / 25);
  return (
    <span className="tnum text-xs text-muted whitespace-nowrap" aria-label={`관련도 ${value}점`} title={`관련도 ${value}점`}>
      관련도 <span aria-hidden className="text-case">{'●'.repeat(dots)}{'○'.repeat(4 - dots)}</span>
    </span>
  );
}
