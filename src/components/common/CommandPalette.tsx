'use client';
// ⌘K 통합검색 — Enter 상세 / Shift+Enter 원문 직행
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCases, useStore } from '@/lib/store';
import { DOCNO_RE, searchAll, type SearchHit } from '@/lib/search';
import { caseSlug, fmtDate } from '@/lib/format';
import { CASE_LABELS, FIELD_NAMES } from '@/lib/labels';
import { DemoTag } from './Chips';

const GROUP_ORDER: SearchHit['group'][] = ['법령', '기관규정', '조례', '판례·해석', '분야'];

export function CommandPalette() {
  const { norms, aliases, paletteOpen, setPaletteOpen, openDetail } = useStore();
  const cases = useCases(paletteOpen);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) setTimeout(() => inputRef.current?.focus(), 0);
    else setQ('');
  }, [paletteOpen]);

  const results = useMemo(() => {
    const hits = searchAll(q, norms, cases ?? [], aliases);
    // 사건번호 패턴이면 판례·해석을 맨 위로, 아니면 그룹 순서대로 그룹당 6건
    const groups = DOCNO_RE.test(q) ? (['판례·해석', ...GROUP_ORDER.filter((g) => g !== '판례·해석')] as SearchHit['group'][]) : GROUP_ORDER;
    return groups.flatMap((g) => hits.filter((h) => h.group === g).slice(0, 6));
  }, [q, norms, cases, aliases]);

  useEffect(() => setSel(0), [q]);

  if (!paletteOpen) return null;

  const close = () => setPaletteOpen(false);
  const activate = (h: SearchHit, external: boolean) => {
    close();
    if (h.group === '분야') return router.push(`/field/${h.field}/`);
    if (h.group === '판례·해석') {
      if (external) window.open(h.c.url, '_blank', 'noopener');
      else router.push(`/cases/${caseSlug(h.c.id)}/`);
      return;
    }
    if (external) window.open(h.norm.url, '_blank', 'noopener');
    else openDetail(h.norm.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter' && results[sel]) {
      e.preventDefault();
      activate(results[sel], e.shiftKey);
    }
  };

  let lastGroup: string | null = null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={close}>
      <div role="dialog" aria-label="통합 검색" className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="법령·규정·조례·판례 검색 (사건번호 가능)"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-base outline-none"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          aria-activedescendant={results[sel] ? `ph-${sel}` : undefined}
        />
        <ul id="palette-results" role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
          {q && results.length === 0 && <li className="px-4 py-3 text-sm text-muted">{cases ? '결과 없음' : '판례·해석 불러오는 중…'}</li>}
          {results.map((h, i) => {
            const header = h.group !== lastGroup ? h.group : null;
            lastGroup = h.group;
            const label =
              h.group === '분야' ? FIELD_NAMES[h.field] : h.group === '판례·해석' ? h.c.title : h.norm.title;
            const sub =
              h.group === '분야'
                ? '분야 페이지'
                : h.group === '판례·해석'
                  ? `${CASE_LABELS[h.c.source].short} · ${h.c.docNo} · ${fmtDate(h.c.decidedAt)}`
                  : `${h.norm.kind}${h.norm.agency ? ` · ${h.norm.agency}` : ''}`;
            const demo = h.group === '판례·해석' ? h.c.demo : h.group !== '분야' ? h.norm.demo : false;
            return (
              <li key={i}>
                {header && <div className="px-4 pt-2 pb-1 text-xs font-semibold text-muted">{header}</div>}
                <div
                  id={`ph-${i}`}
                  role="option"
                  aria-selected={i === sel}
                  onMouseEnter={() => setSel(i)}
                  onClick={(e) => activate(h, e.shiftKey)}
                  className={`mx-1 cursor-pointer rounded-md px-3 py-2 ${i === sel ? 'bg-surface-2' : ''}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {label}
                    {demo && <DemoTag />}
                  </div>
                  <div className="tnum text-xs text-muted">{sub}</div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-4 py-2 text-xs text-muted">↑↓ 이동 · Enter 상세 · Shift+Enter 원문 · Esc 닫기</p>
      </div>
    </div>
  );
}
