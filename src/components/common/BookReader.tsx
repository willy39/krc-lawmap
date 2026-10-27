'use client';
// 법규집 읽기 팝업 — 법규집 항목을 화면 가운데 큰 창으로 연다(조문 목차 · 본문 · 본문 찾기 · 이전/다음 규정)
// 본문은 국가법령정보센터 수집본(data/build/fulltext.json, 지연 로딩). 법규집에만 있는 항목(V~VII)은 안내만 보인다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArticleRow } from '@/types/model';
import { useFullText, useStore } from '@/lib/store';
import { contentRegex, formatArticle, highlightParts } from '@/lib/fulltextSearch';
import { lawArticleUrl } from '@/lib/links';
import { fmtDate } from '@/lib/format';
import { CaseBadge, KindChip, StatusBadges } from './Chips';
import type { BookGroup, BookItem } from './RegulationBook';

export interface BookEntryRef {
  group: BookGroup;
  item: BookItem;
}

function Marked({ text, q }: { text: string; q?: string }) {
  return (
    <>
      {highlightParts(text, q).map((p, k) =>
        p.hit ? (
          <mark key={k} className="rounded-sm bg-case/25 px-0.5 text-inherit">
            {p.t}
          </mark>
        ) : (
          <span key={k}>{p.t}</span>
        ),
      )}
    </>
  );
}

/** '제1조(목적) 본문…' → 머리('제1조(목적)')와 본문을 나눈다 */
function splitHead(r: ArticleRow): { head: string; body: string } {
  const text = r[2].trim();
  const m = r[0] ? text.match(/^(제\s*\d+\s*조(?:\s*의\s*\d+)?\s*(?:\([^)]*\))?)\s*/) : null;
  return m ? { head: m[1], body: text.slice(m[0].length) } : { head: '', body: text };
}

export function BookReader({ entries, index, onIndex, onClose }: { entries: BookEntryRef[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { openDetail, normById } = useStore();
  const { group, item } = entries[index];
  const norm = item.norm;
  const ft = useFullText(!!norm);
  const rows = norm ? ft?.[norm.id] : undefined;
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const re = useMemo(() => contentRegex(q), [q]);
  const matches = useMemo(() => (rows && re ? rows.map((r, i) => (re.test(r[2]) ? i : -1)).filter((i) => i >= 0) : []), [rows, re]);
  const parent = norm?.parentId ? normById.get(norm.parentId) : undefined;
  const repealed = /폐지/.test(item.note ?? '') || group.title === '폐지규정';

  // 규정이 바뀌면 맨 위로, 찾기 초기화
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    setQ('');
    setActive(0);
  }, [index]);
  useEffect(() => setCur(0), [q]);

  // 포커스 이동·복귀, 배경 스크롤 잠금, 키보드(Esc 닫기 · ←→ 이전/다음 규정)
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      prevFocus?.focus();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.target instanceof Element && e.target.closest('input,textarea')) return;
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < entries.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, entries.length, onIndex, onClose]);

  // 목차에서 지금 읽는 조문 표시
  useEffect(() => {
    const box = body.current;
    if (!box || !rows) return;
    const io = new IntersectionObserver(
      (es) => {
        const top = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(Number((top.target as HTMLElement).dataset.row));
      },
      { root: box, rootMargin: '0px 0px -70% 0px' },
    );
    box.querySelectorAll('[data-row]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rows]);

  const scrollTo = (i: number) => body.current?.querySelector(`[data-row="${i}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  const step = (d: number) => {
    if (!matches.length) return;
    const n = (cur + d + matches.length) % matches.length;
    setCur(n);
    scrollTo(matches[n]);
  };
  const prevE = entries[index - 1];
  const nextE = entries[index + 1];
  const articleCount = rows?.filter((r) => r[0]).length ?? 0;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-2 backdrop-blur-[2px] sm:p-6" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-reader-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none sm:h-[90vh]"
      >
        {/* 머리 */}
        <header className="border-b border-border px-5 pt-4 pb-3 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="tnum text-xs text-muted">
                대한적십자사 법규집 › {group.no}. {group.title} › {item.no}
              </p>
              <h2 id="book-reader-title" className={`mt-1 text-xl font-bold leading-snug sm:text-2xl ${repealed ? 'text-muted' : ''}`}>
                {norm?.title ?? item.label}
              </h2>
              <div className="tnum mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                {norm && <KindChip norm={norm} />}
                {norm && <span>시행 {fmtDate(norm.effectiveAt)}</span>}
                {item.note && <span>법규집 {item.note}</span>}
                {parent && <span>상위: {parent.shortTitle ?? parent.title}</span>}
                {repealed && <span className="rounded bg-surface-2 px-1.5 text-[11px]">폐지</span>}
                {norm && <StatusBadges norm={{ ...norm, flags: norm.flags.filter((f) => f !== 'NO_PARENT') }} />}
              </div>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-md px-2 py-1 text-sm hover:bg-surface-2" aria-label="법규집 읽기 닫기">
              닫기 ✕
            </button>
          </div>
          {norm && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <a href={norm.url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-law px-3 py-1.5 font-semibold text-bg hover:opacity-90">
                원문 보기 ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openDetail(norm.id);
                }}
                className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-2"
              >
                상세 정보
              </button>
              <CaseBadge norm={norm} />
            </div>
          )}
        </header>

        {/* 본문 */}
        {norm && !ft ? (
          <p className="p-7 text-sm text-muted">조문 본문 불러오는 중…</p>
        ) : rows?.length ? (
          <div className="grid min-h-0 flex-1 md:grid-cols-[250px_minmax(0,1fr)]">
            <nav aria-label="조문 목차" className="hidden min-h-0 overflow-y-auto border-r border-border bg-bg/60 px-3 py-3 md:block">
              <p className="tnum mb-2 px-2 text-xs font-semibold text-muted">목차 · {articleCount}개 조문</p>
              <ol className="space-y-0.5 text-[13px]">
                {rows.map((r, i) =>
                  r[0] ? (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => scrollTo(i)}
                        aria-current={active === i ? 'true' : undefined}
                        className={`w-full truncate rounded px-2 py-1 text-left hover:bg-surface-2 ${active === i ? 'bg-surface-2 font-semibold text-text' : 'text-muted'} ${re && matches.includes(i) ? 'border-l-2 border-case' : ''}`}
                      >
                        <span className="tnum">{r[0]}</span> {r[1]}
                      </button>
                    </li>
                  ) : (
                    <li key={i} className="px-2 pt-2 pb-0.5 text-xs font-bold text-text">
                      <button type="button" onClick={() => scrollTo(i)} className="text-left hover:underline">
                        {r[2]}
                      </button>
                    </li>
                  ),
                )}
              </ol>
            </nav>
            <div className="flex min-h-0 flex-col">
              <div className="flex items-center gap-2 border-b border-border px-5 py-2 sm:px-8">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && step(e.shiftKey ? -1 : 1)}
                  placeholder="이 규정 본문에서 찾기"
                  title="Enter 다음 · Shift+Enter 이전"
                  aria-label="이 규정 본문에서 찾기"
                  className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm"
                />
                <span className="tnum shrink-0 text-xs text-muted" aria-live="polite">
                  {re ? `${matches.length ? cur + 1 : 0}/${matches.length}` : ''}
                </span>
                <button type="button" onClick={() => step(-1)} disabled={!matches.length} className="rounded border border-border px-2 py-1 text-sm disabled:opacity-40" aria-label="이전 일치 조문">
                  ↑
                </button>
                <button type="button" onClick={() => step(1)} disabled={!matches.length} className="rounded border border-border px-2 py-1 text-sm disabled:opacity-40" aria-label="다음 일치 조문">
                  ↓
                </button>
              </div>
              <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
                <article className="mx-auto max-w-[72ch] space-y-4">
                  {rows.map((r, i) => {
                    const hq = re ? q : undefined;
                    if (!r[0])
                      return (
                        <h3 key={i} data-row={i} className="scroll-mt-4 border-b border-border pt-4 pb-1 text-base font-bold first:pt-0">
                          <Marked text={r[2]} q={hq} />
                        </h3>
                      );
                    const { head, body: text } = splitHead(r);
                    const hit = re ? matches.includes(i) : false;
                    return (
                      <section key={i} data-row={i} className={`scroll-mt-4 rounded-lg px-3 py-2 ${hit ? 'bg-case-bg/60' : ''} ${hit && matches[cur] === i ? 'ring-2 ring-case/50' : ''}`}>
                        {head && (
                          <h4 className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold">
                            <Marked text={head} q={hq} />
                            {norm?.source === 'law' && (
                              <a href={lawArticleUrl(norm.title, r[0])} target="_blank" rel="noopener noreferrer" className="text-xs font-normal text-muted underline">
                                원문 ↗
                              </a>
                            )}
                          </h4>
                        )}
                        <p className="whitespace-pre-line text-[15px] leading-7">
                          <Marked text={formatArticle(text)} q={hq} />
                        </p>
                      </section>
                    );
                  })}
                  <p className="pt-2 text-xs text-muted">본문은 국가법령정보센터 수집본이며, 법적 효력은 원문에 있습니다.</p>
                </article>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-xl space-y-4 text-sm">
              <div className="rounded-xl border border-border bg-bg p-5 leading-relaxed">
                {norm ? (
                  <p>수집된 조문 본문이 없습니다. 위 ‘원문 보기 ↗’에서 국가법령정보센터 원문을 확인하세요.</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      {item.english ? '영문본은 국가법령정보센터에 등재되어 있지 않아 본문을 제공하지 않습니다.' : '이 항목은 대한적십자사 법규집에만 수록되어 있어 본문을 아직 제공하지 않습니다.'}
                    </p>
                    <p className="mt-2 text-muted">대한적십자사 법규집 화면은 보안 접속(HTTPS) 보완 후 연결할 예정입니다. 그 전에는 담당 부서에 문의하세요.</p>
                  </>
                )}
              </div>
              {item.latest && (
                <div className="rounded-xl border border-border p-5">
                  <p className="text-xs font-semibold text-muted">최신 법령 (국가법령정보센터)</p>
                  <a href={item.latest.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-base font-bold text-law hover:underline">
                    {item.latest.name} 원문 ↗
                  </a>
                  <p className="tnum mt-1 text-xs text-muted">
                    시행 {fmtDate(item.latest.effectiveAt)} ({fmtDate(item.latest.promulgatedAt)} {item.latest.revisionType})
                    {item.note ? ` · 법규집 수록본 ${item.note}` : ''}
                  </p>
                  {item.latest.newer && <p className="mt-2 inline-block rounded bg-case-bg px-2 py-0.5 text-xs font-semibold text-case">법규집 수록본 이후 개정되었습니다</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 이전/다음 규정 */}
        <footer className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm sm:px-5">
          <button type="button" onClick={() => prevE && onIndex(index - 1)} disabled={!prevE} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-2 disabled:opacity-30">
            <span aria-hidden>‹</span>
            <span className="truncate">{prevE ? prevE.item.label : '처음'}</span>
          </button>
          <span className="tnum shrink-0 text-xs text-muted">
            {index + 1} / {entries.length} <span className="hidden sm:inline">· ← → 로 이동</span>
          </span>
          <button type="button" onClick={() => nextE && onIndex(index + 1)} disabled={!nextE} className="flex min-w-0 flex-1 items-center justify-end gap-1.5 rounded-md px-2 py-1.5 text-right hover:bg-surface-2 disabled:opacity-30">
            <span className="truncate">{nextE ? nextE.item.label : '끝'}</span>
            <span aria-hidden>›</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
