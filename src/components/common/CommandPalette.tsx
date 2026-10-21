'use client';
// ⌘K 통합검색 — Enter 상세 / Shift+Enter 원문 직행
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCases, useFullText, useStore } from '@/lib/store';
import { MIN_CONTENT_QUERY, searchText, type TextHit } from '@/lib/fulltextSearch';
import { DOCNO_RE, searchAll, type SearchHit } from '@/lib/search';
import { caseSlug, fmtDate } from '@/lib/format';
import { CASE_LABELS, FIELD_NAMES } from '@/lib/labels';
import { DemoTag } from './Chips';
import { withBase } from '@/lib/links';

type Hit = SearchHit | { group: '조문 내용'; t: TextHit; score: number };
const GROUP_ORDER: Hit['group'][] = ['법령', '기관규정', '조례', '조문 내용', '판례·해석', '분야'];
const CONTENT_LIMIT = 8;

export function CommandPalette() {
  const { norms, aliases, paletteOpen, setPaletteOpen, openDetail, normById } = useStore();
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

  // 조문 내용 검색: 입력이 잠시 멈춘 뒤(200ms) 수행, 본문 데이터는 처음 쓸 때 내려받는다
  const [dq, setDq] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 200);
    return () => clearTimeout(t);
  }, [q]);
  const wantsContent = paletteOpen && dq.replace(/\s/g, '').length >= MIN_CONTENT_QUERY && !DOCNO_RE.test(dq);
  const fulltext = useFullText(wantsContent);
  const content = useMemo(() => (wantsContent && fulltext ? searchText(dq, fulltext, { limit: CONTENT_LIMIT, perNorm: 2 }) : null), [wantsContent, fulltext, dq]);

  const results = useMemo(() => {
    const hits: Hit[] = [...searchAll(q, norms, cases ?? [], aliases), ...(content?.hits ?? []).map((t) => ({ group: '조문 내용' as const, t, score: 0 }))];
    // 사건번호 패턴이면 판례·해석을 맨 위로, 아니면 그룹 순서대로 그룹당 6건(조문 내용 8건)
    const groups = DOCNO_RE.test(q) ? (['판례·해석', ...GROUP_ORDER.filter((g) => g !== '판례·해석')] as Hit['group'][]) : GROUP_ORDER;
    return groups.flatMap((g) => hits.filter((h) => h.group === g).slice(0, g === '조문 내용' ? CONTENT_LIMIT : 6));
  }, [q, norms, cases, aliases, content]);

  useEffect(() => setSel(0), [q]);

  if (!paletteOpen) return null;

  const close = () => setPaletteOpen(false);
  const activate = (h: Hit, external: boolean) => {
    close();
    if (h.group === '분야') return router.push(`/field/${h.field}/`);
    if (h.group === '조문 내용') {
      const n = normById.get(h.t.normId);
      if (external && n) window.open(n.url, '_blank', 'noopener');
      else openDetail(h.t.normId, { tab: 'text', article: `#${h.t.index}`, q: dq });
      return;
    }
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
          placeholder="법령·규정·조례 명칭, 조문 내용, 사건번호 검색"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-base outline-none"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          aria-activedescendant={results[sel] ? `ph-${sel}` : undefined}
        />
        <ul id="palette-results" role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
          {q && results.length === 0 && <li className="px-4 py-3 text-sm text-muted">{cases && (!wantsContent || fulltext) ? '결과 없음' : '불러오는 중…'}</li>}
          {wantsContent && !fulltext && results.length > 0 && <li className="px-4 py-1 text-xs text-muted">조문 내용 불러오는 중…</li>}
          {results.map((h, i) => {
            const header = h.group !== lastGroup ? h.group : null;
            lastGroup = h.group;
            const tnorm = h.group === '조문 내용' ? normById.get(h.t.normId) : undefined;
            const label =
              h.group === '분야'
                ? FIELD_NAMES[h.field]
                : h.group === '판례·해석'
                  ? h.c.title
                  : h.group === '조문 내용'
                    ? `${tnorm?.shortTitle ?? tnorm?.title ?? ''} ${h.t.row[0]}${h.t.row[1] ? `(${h.t.row[1]})` : ''}`
                    : h.norm.title;
            const sub =
              h.group === '분야' ? (
                '분야 페이지'
              ) : h.group === '판례·해석' ? (
                `${CASE_LABELS[h.c.source].short} · ${h.c.docNo} · ${fmtDate(h.c.decidedAt)}`
              ) : h.group === '조문 내용' ? (
                <>
                  {h.t.before}
                  <mark className="rounded-sm bg-case-bg px-0.5 text-case">{h.t.match}</mark>
                  {h.t.after}
                </>
              ) : (
                `${h.norm.kind}${h.norm.agency ? ` · ${h.norm.agency}` : ''}`
              );
            const demo = h.group === '판례·해석' ? h.c.demo : h.group === '분야' ? false : h.group === '조문 내용' ? tnorm?.demo : h.norm.demo;
            return (
              <li key={i}>
                {header && (
                  <div className="px-4 pt-2 pb-1 text-xs font-semibold text-muted">
                    {header}
                    {header === '조문 내용' && content && (
                      <span className="tnum font-normal">
                        {' '}
                        · {content.norms}개 규범 {content.total}개 조문
                        {content.total > CONTENT_LIMIT && (
                          <>
                            {' '}
                            ·{' '}
                            <a href={withBase(`/list/?content=1&q=${encodeURIComponent(dq)}`)} onClick={close} className="underline">
                              일람에서 모두 보기
                            </a>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )}
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
                  <div className={`tnum text-xs text-muted ${h.group === '조문 내용' ? 'line-clamp-2' : ''}`}>{sub}</div>
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
