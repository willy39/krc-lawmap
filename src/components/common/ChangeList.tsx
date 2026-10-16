'use client';
import Link from 'next/link';
import type { ChangeEntry } from '@/types/model';
import { caseSlug, fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';

const KIND: Record<ChangeEntry['kind'], { label: string; cls: string }> = {
  NORM_ADDED: { label: '규범 추가', cls: 'bg-law-bg text-law' },
  NORM_REVISED: { label: '규범 개정', cls: 'bg-accent/10 text-accent' },
  NORM_REMOVED: { label: '규범 폐지', cls: 'bg-surface-2 text-muted' },
  CASE_ADDED: { label: '신규 판례·해석', cls: 'bg-case-bg text-case' },
};

export function ChangeList({ entries }: { entries: ChangeEntry[] }) {
  const { openDetail, normById } = useStore();
  if (!entries.length) return <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">최근 변경 사항이 없습니다.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {entries.map((e) => (
        <li key={`${e.kind}-${e.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${KIND[e.kind].cls}`}>{KIND[e.kind].label}</span>
          {e.kind === 'CASE_ADDED' ? (
            <Link href={`/cases/${caseSlug(e.id)}/`} className="font-medium hover:underline">
              {e.title}
            </Link>
          ) : normById.has(e.id) ? (
            <button type="button" className="text-left font-medium hover:underline" onClick={() => openDetail(e.id)}>
              {e.title}
            </button>
          ) : (
            <span className="font-medium">{e.title}</span>
          )}
          <span className="tnum ml-auto text-xs text-muted">
            {e.detail ? `${e.detail} · ` : ''}
            {fmtDate(e.date)}
          </span>
        </li>
      ))}
    </ul>
  );
}
