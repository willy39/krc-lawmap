'use client';
// 연도별 막대 — 막대 클릭 시 연도 필터
import type { CaseItem } from '@/types/model';

export function YearHistogram({ cases, selected, onSelect }: { cases: CaseItem[]; selected?: string; onSelect: (y: string | null) => void }) {
  const years = cases.map((c) => c.decidedAt.slice(0, 4)).filter(Boolean);
  if (!years.length) return null;
  const min = Math.min(...years.map(Number));
  const max = Math.max(new Date().getFullYear(), ...years.map(Number));
  const counts = new Map<number, number>();
  for (const y of years) counts.set(Number(y), (counts.get(Number(y)) ?? 0) + 1);
  const peak = Math.max(...counts.values());
  const span = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex h-16 items-end gap-px" role="group" aria-label="연도별 건수">
        {span.map((y) => {
          const n = counts.get(y) ?? 0;
          const sel = selected === String(y);
          return (
            <button
              key={y}
              type="button"
              disabled={!n}
              onClick={() => onSelect(sel ? null : String(y))}
              aria-pressed={sel}
              aria-label={`${y}년 ${n}건`}
              title={`${y}년 ${n}건`}
              className="group flex h-full flex-1 items-end disabled:cursor-default"
            >
              <span
                className={`block w-full rounded-t-sm ${sel ? 'bg-case' : n ? 'bg-case/45 group-hover:bg-case/70' : 'bg-border/50'}`}
                style={{ height: n ? `${Math.max(12, (n / peak) * 100)}%` : '2px' }}
              />
            </button>
          );
        })}
      </div>
      <div className="tnum flex justify-between text-[11px] text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
