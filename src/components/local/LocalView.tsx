'use client';
// 자치법규 지역뷰 (설계서 7.4) — 지도 대신 시·도 타일 그리드 (접근성·모바일·정확성 우선)
import { useMemo } from 'react';
import type { NormItem, OrdinanceBundle, RegionInfo } from '@/types/model';
import { useStore } from '@/lib/store';
import { useQueryState } from '@/lib/url-state';
import { BUNDLE_NAMES } from '@/lib/labels';
import { downloadCsv, fmtDate } from '@/lib/format';
import { CaseBadge, DemoTag, ExtLink, StatusBadges } from '@/components/common/Chips';

const BUNDLES: OrdinanceBundle[] = ['redcross', 'blood', 'disaster', 'family'];

export function LocalView({ regions }: { regions: RegionInfo[] }) {
  const { norms, normById, openDetail } = useStore();
  const { get, set } = useQueryState();
  const bundle = get('bundle') as OrdinanceBundle | '';
  const levels = get('level') || 'sido,sigungu,edu';
  const zero = get('zero') === '1';
  const sido = get('sido');

  const ords = useMemo(
    () =>
      norms.filter(
        (n) => n.source === 'ordin' && (!bundle || n.bundle === bundle) && levels.split(',').includes(n.region?.type ?? 'sido'),
      ),
    [norms, bundle, levels],
  );
  const bySido = useMemo(() => {
    const m = new Map<string, NormItem[]>();
    for (const o of ords) {
      const k = o.region?.sido ?? '(지역 미상)';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    }
    return m;
  }, [ords]);
  const max = Math.max(1, ...[...bySido.values()].map((l) => l.length));
  const selected = sido ? (bySido.get(sido) ?? []) : ords;

  const toggleLevel = (lv: string) => {
    const s = new Set(levels.split(','));
    if (s.has(lv)) s.delete(lv);
    else s.add(lv);
    set({ level: [...s].join(',') || 'sido' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="묶음" className="flex flex-wrap gap-1">
          <button type="button" aria-pressed={!bundle} onClick={() => set({ bundle: null })} className={`rounded-full border px-3 py-1 text-sm ${!bundle ? 'border-text font-semibold' : 'border-border text-muted'}`}>
            전체
          </button>
          {BUNDLES.map((b) => (
            <button key={b} type="button" aria-pressed={bundle === b} onClick={() => set({ bundle: b })} className={`rounded-full border px-3 py-1 text-sm ${bundle === b ? 'border-text font-semibold' : 'border-border text-muted'}`}>
              {BUNDLE_NAMES[b]}
            </button>
          ))}
        </div>
        <fieldset className="flex items-center gap-3 text-sm">
          <legend className="sr-only">수준</legend>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={levels.includes('sido')} onChange={() => toggleLevel('sido')} /> 광역
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={levels.includes('sigungu')} onChange={() => toggleLevel('sigungu')} /> 기초
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={levels.includes('edu')} onChange={() => toggleLevel('edu')} /> 교육청
          </label>
        </fieldset>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={zero} onChange={(e) => set({ zero: e.target.checked ? '1' : null })} /> 조례 없는 시·도 강조
        </label>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label="시·도별 조례 수">
        {regions.map((r) => {
          const n = bySido.get(r.sido)?.length ?? 0;
          const alpha = n ? 0.15 + 0.6 * (n / max) : 0;
          const isSel = sido === r.sido;
          return (
            <li key={r.code}>
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => set({ sido: isSel ? null : r.sido })}
                className={`flex w-full flex-col items-center rounded-lg border px-2 py-3 ${isSel ? 'border-text ring-2 ring-text/30' : 'border-border'} ${
                  zero && n === 0 ? 'border-dashed border-accent bg-accent/10' : ''
                }`}
                style={n && !(zero && n === 0) ? { background: `color-mix(in srgb, var(--local) ${Math.round(alpha * 100)}%, var(--surface))` } : { background: zero && n === 0 ? undefined : 'var(--surface)' }}
              >
                <span className={`text-sm font-semibold ${alpha > 0.5 ? 'text-white' : ''}`}>{r.short}</span>
                <span className={`tnum text-lg font-bold ${alpha > 0.5 ? 'text-white' : ''}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">
          {sido ? `선택: ${sido}` : '전체'} <span className="tnum text-muted">({selected.length}건)</span>
        </h2>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm hover:bg-surface-2"
          onClick={() =>
            downloadCsv(
              'krc-ordinances.csv',
              selected.map((o) => ({ 명칭: o.title, 시도: o.region?.sido, 시군구: o.region?.sigungu ?? '', 종류: o.kind, 묶음: o.bundle ? BUNDLE_NAMES[o.bundle] : '', 시행일: o.effectiveAt ?? '', 상위법: o.parentId ? normById.get(o.parentId)?.title : '', 원문: o.url })),
            )
          }
        >
          CSV
        </button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {selected.length === 0 && <li className="p-4 text-sm text-muted">해당 조건의 조례가 없습니다.</li>}
        {selected.map((o) => {
          const parent = o.parentId ? normById.get(o.parentId) : undefined;
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-surface-2">
              <ExtLink href={o.url} className="font-medium">
                {o.title}
              </ExtLink>
              {o.demo && <DemoTag />}
              <StatusBadges norm={{ ...o, demo: false }} />
              <CaseBadge norm={o} />
              <span className="tnum text-xs text-muted">
                {o.kind} · 시행 {fmtDate(o.effectiveAt)} · 상위: {parent?.shortTitle ?? parent?.title ?? '미지정'}
              </span>
              <button type="button" onClick={() => openDetail(o.id)} className="ml-auto rounded border border-border px-2 text-xs text-muted hover:text-text">
                상세
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
