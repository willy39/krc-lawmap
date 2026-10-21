'use client';
// 규범 전체 일람 (/list) — 필터는 URL 쿼리와 동기화, CSV 다운로드
import { useMemo } from 'react';
import { useFullText, useStore } from '@/lib/store';
import { MIN_CONTENT_QUERY, matchCounts, searchText } from '@/lib/fulltextSearch';
import { useQueryState } from '@/lib/url-state';
import { FIELD_NAMES, LEVEL_NAMES, SOURCE_GROUP_NAMES } from '@/lib/labels';
import { downloadCsv, fmtDate } from '@/lib/format';
import { FIELD_CODES } from '@/types/model';
import { CaseBadge, ExtLink, FieldChip, KindChip, StatusBadges } from './Chips';

const SOURCES = ['law', 'admrul', 'trty', 'ordin', 'pi'] as const;

export function NormList() {
  const { norms, openDetail } = useStore();
  const { get, set } = useQueryState();
  const source = get('source');
  const field = get('field');
  const q = get('q');
  const recent = get('recent') === '1';
  const content = get('content') === '1';
  const contentOn = content && q.replace(/\s/g, '').length >= MIN_CONTENT_QUERY;
  const ft = useFullText(contentOn);
  const counts = useMemo(() => (contentOn && ft ? matchCounts(q, ft) : null), [contentOn, ft, q]);

  const rows = useMemo(
    () =>
      norms.filter(
        (n) =>
          (!source || n.source === source) &&
          (!field || n.primaryField === field || n.secondaryFields.includes(field as never)) &&
          (!q || `${n.title} ${n.agency}`.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || !!counts?.get(n.id)) &&
          (!recent || n.flags.includes('RECENT') || n.flags.includes('UPCOMING')),
      ),
    [norms, source, field, q, recent, counts],
  );

  const sel = 'rounded-md border border-border bg-surface px-2 py-1.5 text-sm';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs text-muted">
          구분
          <select className={sel} value={source} onChange={(e) => set({ source: e.target.value })}>
            <option value="">전체</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_GROUP_NAMES[s]}
              </option>
            ))}
          </select>
        </label>
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
        <label className="flex min-w-0 flex-1 flex-col text-xs text-muted">
          {content ? '명칭·소관·조문 내용 검색' : '명칭·소관 검색'}
          <input className={sel} value={q} onChange={(e) => set({ q: e.target.value })} placeholder={content ? '예: 헌혈증서, 징계' : '예: 인사, 경기도'} />
        </label>
        <label className="flex items-center gap-1.5 py-1.5 text-sm" title="법령·기관규정·조례의 조문 본문에서도 찾습니다 (두 글자 이상)">
          <input type="checkbox" checked={content} onChange={(e) => set({ content: e.target.checked ? '1' : null })} /> 조문 내용 포함
        </label>
        <label className="flex items-center gap-1.5 py-1.5 text-sm">
          <input type="checkbox" checked={recent} onChange={(e) => set({ recent: e.target.checked ? '1' : null })} /> 최근 개정·시행 예정만
        </label>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
          onClick={() =>
            downloadCsv(
              `krc-norms-${new Date().toISOString().slice(0, 10)}.csv`,
              rows.map((n) => ({
                id: n.id,
                명칭: n.title,
                구분: n.kind,
                위계: LEVEL_NAMES[n.level],
                소관: n.agency,
                시도: n.region?.sido ?? '',
                시군구: n.region?.sigungu ?? '',
                공포일: n.promulgatedAt ?? '',
                시행일: n.effectiveAt ?? '',
                분야: FIELD_NAMES[n.primaryField],
                판례해석수: n.caseCount,
                원문: n.url,
              })),
            )
          }
        >
          CSV 다운로드
        </button>
      </div>
      <p className="tnum text-sm text-muted" aria-live="polite">
        {rows.length}건
        {contentOn && !ft && ' · 조문 내용 불러오는 중…'}
        {counts && ` · 조문 내용 일치 ${counts.size}개 규범 ${[...counts.values()].reduce((a, b) => a + b, 0)}개 조문`}
      </p>

      {/* 데스크톱 표 */}
      <table className="hidden w-full border-collapse overflow-hidden rounded-xl border border-border bg-surface text-sm md:table">
        <thead className="bg-surface-2 text-left text-xs text-muted">
          <tr>
            <th className="px-3 py-2">명칭</th>
            <th className="px-3 py-2">구분</th>
            <th className="px-3 py-2">소관·지자체</th>
            <th className="px-3 py-2">시행일</th>
            <th className="px-3 py-2">분야</th>
            <th className="px-3 py-2 text-right">⚖</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id} className="border-t border-border hover:bg-surface-2">
              <td className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ExtLink href={n.url} className={n.isCore ? 'font-semibold' : ''}>
                    {n.title}
                  </ExtLink>
                  <button type="button" onClick={() => openDetail(n.id)} className="rounded border border-border px-1.5 text-xs text-muted hover:text-text" aria-label={`${n.title} 상세`}>
                    상세
                  </button>
                  <StatusBadges norm={n} />
                </div>
                <ContentHit id={n.id} q={q} ft={counts?.get(n.id) ? ft : null} count={counts?.get(n.id)} onOpen={(index) => openDetail(n.id, { tab: 'text', article: `#${index}`, q })} />
              </td>
              <td className="px-3 py-2">
                <KindChip norm={n} />
              </td>
              <td className="px-3 py-2 text-muted">{n.agency || '—'}</td>
              <td className="tnum px-3 py-2 whitespace-nowrap text-muted">{fmtDate(n.effectiveAt)}</td>
              <td className="px-3 py-2">
                <FieldChip code={n.primaryField} />
              </td>
              <td className="px-3 py-2 text-right">
                <CaseBadge norm={n} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 모바일 카드 */}
      <ul className="space-y-2 md:hidden">
        {rows.map((n) => (
          <li key={n.id} className="rounded-lg border border-border bg-surface p-3" onClick={() => openDetail(n.id)}>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <KindChip norm={n} />
              <StatusBadges norm={n} />
              <CaseBadge norm={n} />
            </div>
            <ExtLink href={n.url} className="font-medium">
              {n.title}
            </ExtLink>
            <p className="tnum text-xs text-muted">
              {n.agency || '—'} · 시행 {fmtDate(n.effectiveAt)}
            </p>
            <ContentHit id={n.id} q={q} ft={counts?.get(n.id) ? ft : null} count={counts?.get(n.id)} onOpen={(index) => openDetail(n.id, { tab: 'text', article: `#${index}`, q })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentHit({ id, q, ft, count, onOpen }: { id: string; q: string; ft: ReturnType<typeof useFullText>; count?: number; onOpen: (index: number) => void }) {
  if (!ft || !count) return null;
  const h = searchText(q, ft, { ids: [id], limit: 1, perNorm: 1 }).hits[0];
  if (!h) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(h.index);
      }}
      className="mt-1 block w-full rounded bg-case-bg/50 px-2 py-1 text-left text-xs text-muted hover:bg-case-bg"
    >
      <span className="font-semibold text-case">
        {h.row[0]}
        {h.row[1] ? `(${h.row[1]})` : ''}
        {count > 1 ? ` 외 ${count - 1}개 조문` : ''}
      </span>{' '}
      {h.before}
      <mark className="rounded-sm bg-case/25 px-0.5 text-text">{h.match}</mark>
      {h.after}
    </button>
  );
}
