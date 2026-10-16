'use client';
import type { NormItem } from '@/types/model';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { CaseBadge, ExtLink, KindChip, StatusBadges } from './Chips';

export function FieldNormList({ norms }: { norms: NormItem[] }) {
  const { openDetail } = useStore();
  if (!norms.length) return <p className="text-sm text-muted">해당 분야 규범이 없습니다.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {norms.map((n) => (
        <li key={n.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm">
          <KindChip norm={n} />
          <ExtLink href={n.url} className={n.isCore ? 'font-semibold' : ''}>
            {n.title}
          </ExtLink>
          <StatusBadges norm={n} />
          <CaseBadge norm={n} />
          <span className="tnum ml-auto text-xs text-muted">시행 {fmtDate(n.effectiveAt)}</span>
          <button type="button" onClick={() => openDetail(n.id)} className="rounded border border-border px-2 text-xs text-muted hover:text-text">
            상세
          </button>
        </li>
      ))}
    </ul>
  );
}
