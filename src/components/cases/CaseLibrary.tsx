'use client';
// 판례·해석 라이브러리 (설계서 7.5)
import { useMemo } from 'react';
import type { CaseItem, CaseSource } from '@/types/model';
import { CASE_SOURCES, FIELD_CODES } from '@/types/model';
import { useStore } from '@/lib/store';
import { useQueryState } from '@/lib/url-state';
import { CASE_LABELS, FIELD_NAMES } from '@/lib/labels';
import { downloadCsv } from '@/lib/format';
import { moreSearchUrl } from '@/lib/links';
import { CaseCard } from './CaseCard';
import { YearHistogram } from './YearHistogram';

export function CaseLibrary({ cases }: { cases: CaseItem[] }) {
  const { relations, normById } = useStore();
  const { get, set } = useQueryState();
  const type = get('type') as CaseSource | '';
  const field = get('field');
  const year = get('year');
  const from = get('from');
  const to = get('to');
  const norm = get('norm');
  const tag = get('tag');
  const noAuto = get('auto') === '0';
  const sort = get('sort') || 'latest';

  const linkedNorms = useMemo(() => {
    const ids = [...new Set(relations.map((r) => r.to))];
    return ids.map((id) => normById.get(id)).filter((n) => !!n).sort((a, b) => b!.caseCount - a!.caseCount);
  }, [relations, normById]);
  const tags = useMemo(() => [...new Set(cases.flatMap((c) => c.issueTags))].sort(), [cases]);

  // 유형 탭 이외 필터
  const base = useMemo(() => {
    const normCases = norm ? new Set(relations.filter((r) => r.to === norm).map((r) => r.from)) : null;
    return cases.filter(
      (c) =>
        (!field || c.fields.includes(field as never)) &&
        (!from || c.decidedAt.slice(0, 4) >= from) &&
        (!to || c.decidedAt.slice(0, 4) <= to) &&
        (!normCases || normCases.has(c.id)) &&
        (!tag || c.issueTags.includes(tag)) &&
        (!noAuto || c.review !== 'auto'),
    );
  }, [cases, field, from, to, norm, tag, noAuto, relations]);

  const byType = type ? base.filter((c) => c.source === type) : base;
  const rows = useMemo(() => {
    const list = year ? byType.filter((c) => c.decidedAt.startsWith(year)) : byType;
    return [...list].sort((a, b) => (sort === 'relevance' ? b.relevance - a.relevance || b.decidedAt.localeCompare(a.decidedAt) : b.decidedAt.localeCompare(a.decidedAt)));
  }, [byType, year, sort]);

  const sel = 'rounded-md border border-border bg-surface px-2 py-1.5 text-sm';
  const years = cases.map((c) => Number(c.decidedAt.slice(0, 4))).filter(Boolean);
  const minY = Math.min(2000, ...years);
  const maxY = new Date().getFullYear();
  const yearOpts = Array.from({ length: maxY - minY + 1 }, (_, i) => String(maxY - i));

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="자료 유형" className="flex gap-1 overflow-x-auto border-b border-border">
        {[{ id: '', label: '전체', n: base.length }, ...CASE_SOURCES.map((s) => ({ id: s, label: CASE_LABELS[s].name, n: base.filter((c) => c.source === s).length }))].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={type === t.id}
            onClick={() => set({ type: t.id || null })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${type === t.id ? 'border-text font-semibold' : 'border-transparent text-muted hover:text-text'}`}
          >
            {t.label} <span className="tnum">{t.n}</span>
          </button>
        ))}
      </div>

      <details className="rounded-xl border border-border bg-surface p-3 md:open:block" open>
        <summary className="cursor-pointer text-sm font-semibold">필터</summary>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-muted">
            분야
            <select className={sel} value={field} onChange={(e) => set({ field: e.target.value })}>
              <option value="">전체</option>
              {FIELD_CODES.map((f) => (
                <option key={f} value={f}>
                  {FIELD_NAMES[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-muted">
            연도(부터)
            <select className={sel} value={from} onChange={(e) => set({ from: e.target.value, year: null })}>
              <option value="">—</option>
              {yearOpts.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-muted">
            연도(까지)
            <select className={sel} value={to} onChange={(e) => set({ to: e.target.value, year: null })}>
              <option value="">—</option>
              {yearOpts.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-muted">
            관련 규범
            <select className={`${sel} max-w-[14rem]`} value={norm} onChange={(e) => set({ norm: e.target.value })}>
              <option value="">전체</option>
              {linkedNorms.map((n) => (
                <option key={n!.id} value={n!.id}>
                  {n!.shortTitle ?? n!.title} ({n!.caseCount})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-muted">
            쟁점태그
            <select className={sel} value={tag} onChange={(e) => set({ tag: e.target.value })}>
              <option value="">전체</option>
              {tags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 py-1.5 text-sm">
            <input type="checkbox" checked={!noAuto} onChange={(e) => set({ auto: e.target.checked ? null : '0' })} /> 자동분류 포함
          </label>
          <label className="flex flex-col text-xs text-muted">
            정렬
            <select className={sel} value={sort} onChange={(e) => set({ sort: e.target.value === 'latest' ? null : e.target.value })}>
              <option value="latest">최신순</option>
              <option value="relevance">관련도순</option>
            </select>
          </label>
          <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2" onClick={() => set({ field: null, from: null, to: null, norm: null, tag: null, auto: null, year: null, sort: null })}>
            초기화
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
            onClick={() =>
              downloadCsv(
                'krc-cases.csv',
                rows.map((c) => ({ id: c.id, 유형: CASE_LABELS[c.source].name, 문서번호: c.docNo, 제목: c.title, 기관: c.issuer, 일자: c.decidedAt, 분야: c.fields.map((f) => FIELD_NAMES[f]), 쟁점: c.issueTags, 관련도: c.relevance, 검수: c.review, 원문: c.url })),
              )
            }
          >
            CSV
          </button>
        </div>
        <div className="mt-4">
          <YearHistogram cases={byType} selected={year} onSelect={(y) => set({ year: y })} />
        </div>
      </details>

      <p className="tnum text-sm text-muted" aria-live="polite">
        {rows.length}건{year ? ` · ${year}년` : ''}
      </p>
      <div className="space-y-3">
        {rows.map((c) => (
          <CaseCard key={c.id} c={c} />
        ))}
        {rows.length === 0 && <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">조건에 맞는 자료가 없습니다.</p>}
        <a href={moreSearchUrl('대한적십자사')} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-dashed border-border p-4 text-sm hover:bg-surface-2">
          🔎 law.go.kr에서 ‘대한적십자사’로 더 찾기 ↗ <span className="text-muted">(검수되지 않은 자료 포함)</span>
        </a>
      </div>
    </div>
  );
}
