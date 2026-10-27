'use client';
// 법규집 읽기 팝업 — 법규집 항목을 화면 가운데 큰 창으로 연다(목차 · 본문 · 본문 찾기 · 이전/다음 규정)
// 본문: I~IV 는 국가법령정보센터 수집본(fulltext.json), V~VII 은 법규집 수록본(book-text.json, 빌드타임 수집). 둘 다 지연 로딩.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBookText, useFullText, useStore } from '@/lib/store';
import { contentRegex, formatArticle, highlightParts } from '@/lib/fulltextSearch';
import { inToc, unitsFromBlocks, unitsFromRows, unitText, type Unit } from '@/lib/bookUnits';
import { lawArticleUrl, withBase } from '@/lib/links';
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

const tocLabel = (u: Unit) => (u.k === 'art' ? u.head : u.k === 'h' ? u.x : u.k === 'table' || u.k === 'img' ? (u.caption ?? '') : '');

export function BookReader({ entries, index, onIndex, onClose }: { entries: BookEntryRef[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { openDetail, normById } = useStore();
  const { group, item } = entries[index];
  const norm = item.norm;
  const ft = useFullText(!!norm);
  const bt = useBookText(!norm && !!item.krcId);
  const book = !norm && item.krcId ? bt?.[item.krcId] : undefined;
  const loading = norm ? !ft : !!item.krcId && !bt;
  const units = useMemo<Unit[]>(() => {
    if (norm) return unitsFromRows(ft?.[norm.id] ?? []);
    return book ? unitsFromBlocks(book.blocks) : [];
  }, [norm, ft, book]);
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const re = useMemo(() => contentRegex(q), [q]);
  const matches = useMemo(() => (re ? units.map((u, i) => (re.test(unitText(u)) ? i : -1)).filter((i) => i >= 0) : []), [units, re]);
  const parent = norm?.parentId ? normById.get(norm.parentId) : undefined;
  const repealed = /폐지/.test(item.note ?? '') || group.title === '폐지규정';
  const toc = units.map((u, i) => [u, i] as const).filter(([u]) => inToc(u));
  const articleCount = units.filter((u) => u.k === 'art').length;

  // 규정이 바뀌면 맨 위로, 찾기 초기화
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    setQ('');
    setActive(0);
  }, [index]);
  useEffect(() => setCur(0), [q]);

  // 포커스 이동·복귀, 배경 스크롤 잠금
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
  // 키보드: Esc 닫기 · ←→ 이전/다음 규정
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

  // 목차에서 지금 읽는 곳 표시
  useEffect(() => {
    const box = body.current;
    if (!box || !units.length) return;
    const io = new IntersectionObserver(
      (es) => {
        const top = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(Number((top.target as HTMLElement).dataset.row));
      },
      { root: box, rootMargin: '0px 0px -70% 0px' },
    );
    box.querySelectorAll('[data-row]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [units]);

  const scrollTo = (i: number) => body.current?.querySelector(`[data-row="${i}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  const step = (d: number) => {
    if (!matches.length) return;
    const n = (cur + d + matches.length) % matches.length;
    setCur(n);
    scrollTo(matches[n]);
  };
  const prevE = entries[index - 1];
  const nextE = entries[index + 1];
  const hq = re ? q : undefined;
  const ring = (i: number) => (re && matches.includes(i) ? `bg-case-bg/60 ${matches[cur] === i ? 'ring-2 ring-case/50' : ''}` : '');

  const renderUnit = (u: Unit, i: number) => {
    if (u.k === 'h') {
      const size = u.lv <= 1 ? 'text-base border-b border-border pb-1' : u.lv === 2 ? 'text-[15px]' : 'text-sm text-muted';
      return (
        <h3 key={i} data-row={i} className={`scroll-mt-4 rounded pt-4 font-bold first:pt-0 ${size} ${ring(i)}`}>
          <Marked text={u.x} q={hq} />
        </h3>
      );
    }
    if (u.k === 'art')
      return (
        <section key={i} data-row={i} className={`scroll-mt-4 rounded-lg px-3 py-2 ${ring(i)}`}>
          <h4 className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold">
            <Marked text={u.head} q={hq} />
            {u.no && norm?.source === 'law' && (
              <a href={lawArticleUrl(norm.title, u.no)} target="_blank" rel="noopener noreferrer" className="text-xs font-normal text-muted underline">
                원문 ↗
              </a>
            )}
          </h4>
          <p className="whitespace-pre-line text-[15px] leading-7">
            <Marked text={formatArticle(u.x)} q={hq} />
          </p>
        </section>
      );
    if (u.k === 'p')
      return (
        <p key={i} data-row={i} className={`scroll-mt-4 rounded-lg px-3 py-1 whitespace-pre-line text-[15px] leading-7 ${ring(i)}`}>
          <Marked text={u.x} q={hq} />
        </p>
      );
    if (u.k === 'table')
      return (
        <figure key={i} data-row={i} className={`scroll-mt-4 rounded-lg px-1 py-2 ${ring(i)}`}>
          {u.caption && (
            <figcaption className="mb-2 text-sm font-bold">
              <Marked text={u.caption} q={hq} />
            </figcaption>
          )}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-[13px] leading-relaxed">
              <tbody>
                {u.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((c, k) => {
                      const Tag = c.h ? 'th' : 'td';
                      return (
                        <Tag key={k} colSpan={c.cs} rowSpan={c.rs} className={`border border-border px-2 py-1.5 align-top whitespace-pre-line break-keep ${c.h ? 'bg-surface-2 text-center font-semibold' : ''}`}>
                          <Marked text={c.x} q={hq} />
                        </Tag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    return (
      <figure key={i} data-row={i} className={`scroll-mt-4 rounded-lg p-1 ${ring(i)}`}>
        <img src={withBase(`/data/${u.src}`)} width={u.w} height={u.h} loading="lazy" alt={u.caption ?? '법규집 그림'} className="mx-auto h-auto max-w-full rounded border border-border bg-white" />
        {u.caption && <figcaption className="mt-1 text-center text-xs text-muted">{u.caption}</figcaption>}
      </figure>
    );
  };

  const source = norm
    ? '본문은 국가법령정보센터 수집본이며, 법적 효력은 원문에 있습니다.'
    : book
      ? `본문은 대한적십자사 법규집 수록본입니다(${fmtDate(book.fetchedAt)} 수집).`
      : '';

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
                {!norm && book && <span>법규집 수록본</span>}
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
          {item.latest && (
            <p className="tnum mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-surface-2 px-3 py-2 text-xs">
              <span className="text-muted">최신 법령</span>
              <a href={item.latest.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-law hover:underline">
                {item.latest.name} 원문 ↗
              </a>
              <span className="text-muted">
                시행 {fmtDate(item.latest.effectiveAt)} ({fmtDate(item.latest.promulgatedAt)} {item.latest.revisionType})
              </span>
              {item.latest.newer && <span className="rounded bg-case-bg px-1.5 font-semibold text-case">아래 법규집 수록본 이후 개정</span>}
            </p>
          )}
        </header>

        {/* 본문 */}
        {loading ? (
          <p className="p-7 text-sm text-muted">본문 불러오는 중…</p>
        ) : units.length ? (
          <div className="grid min-h-0 flex-1 md:grid-cols-[250px_minmax(0,1fr)]">
            <nav aria-label="목차" className="hidden min-h-0 overflow-y-auto border-r border-border bg-bg/60 px-3 py-3 md:block">
              <p className="tnum mb-2 px-2 text-xs font-semibold text-muted">목차{articleCount ? ` · ${articleCount}개 조문` : ''}</p>
              {toc.length ? (
                <ol className="space-y-0.5 text-[13px]">
                  {toc.map(([u, i]) => (
                    <li key={i} className={u.k === 'h' && u.lv <= 1 ? 'pt-2' : ''}>
                      <button
                        type="button"
                        onClick={() => scrollTo(i)}
                        aria-current={active === i ? 'true' : undefined}
                        className={`w-full truncate rounded px-2 py-1 text-left hover:bg-surface-2 ${u.k === 'h' ? 'text-xs font-bold text-text' : active === i ? 'bg-surface-2 font-semibold text-text' : 'text-muted'} ${re && matches.includes(i) ? 'border-l-2 border-case' : ''}`}
                      >
                        {tocLabel(u)}
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-2 text-xs text-muted">조문 구분이 없는 문서입니다.</p>
              )}
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
                <button type="button" onClick={() => step(-1)} disabled={!matches.length} className="rounded border border-border px-2 py-1 text-sm disabled:opacity-40" aria-label="이전 일치">
                  ↑
                </button>
                <button type="button" onClick={() => step(1)} disabled={!matches.length} className="rounded border border-border px-2 py-1 text-sm disabled:opacity-40" aria-label="다음 일치">
                  ↓
                </button>
              </div>
              <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
                <article className="mx-auto max-w-[76ch] space-y-3 break-keep">
                  {units.map(renderUnit)}
                  <p className="pt-2 text-xs text-muted">{source}</p>
                </article>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-xl rounded-xl border border-border bg-bg p-5 text-sm leading-relaxed">
              {norm ? (
                <p>수집된 조문 본문이 없습니다. 위 ‘원문 보기 ↗’에서 국가법령정보센터 원문을 확인하세요.</p>
              ) : book ? (
                <p>대한적십자사 법규집에도 이 항목의 본문이 등록되어 있지 않습니다{repealed ? '(폐지된 규정)' : ''}.</p>
              ) : (
                <>
                  <p className="font-semibold">{item.english ? '영문본은 본문을 제공하지 않습니다.' : '이 항목의 본문을 아직 수집하지 못했습니다.'}</p>
                  <p className="mt-2 text-muted">대한적십자사 법규집 화면은 보안 접속(HTTPS) 보완 후 연결할 예정입니다.</p>
                </>
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
