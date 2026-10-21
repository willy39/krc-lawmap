'use client';
// 조문 본문 탭 — 조문 내용 검색 결과에서 들어오면 해당 조문으로 스크롤하고 검색어를 강조한다
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NormItem } from '@/types/model';
import { useFullText } from '@/lib/store';
import { contentRegex, formatArticle, highlightParts } from '@/lib/fulltextSearch';
import { lawArticleUrl } from '@/lib/links';

export function ArticleText({ norm, initialQ, focusIndex }: { norm: NormItem; initialQ?: string; focusIndex?: number }) {
  const ft = useFullText(true);
  const [q, setQ] = useState(initialQ ?? '');
  const box = useRef<HTMLDivElement>(null);
  const rows = ft?.[norm.id];
  const re = useMemo(() => contentRegex(q), [q]);
  const matches = useMemo(() => (rows && re ? rows.map((r, i) => (re.test(r[2]) ? i : -1)).filter((i) => i >= 0) : []), [rows, re]);
  const [cur, setCur] = useState(0);

  const scrollTo = (i: number) => box.current?.querySelector(`[data-row="${i}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  useEffect(() => {
    if (rows && focusIndex !== undefined) setTimeout(() => scrollTo(focusIndex), 60);
  }, [rows, focusIndex]);
  useEffect(() => setCur(0), [q]);

  if (!ft) return <p className="text-sm text-muted">조문 본문 불러오는 중…</p>;
  if (!rows?.length) return <p className="text-sm text-muted">수집된 조문 본문이 없습니다. 원문 보기 ↗에서 확인하세요.</p>;

  const step = (d: number) => {
    if (!matches.length) return;
    const n = (cur + d + matches.length) % matches.length;
    setCur(n);
    scrollTo(matches[n]);
  };

  return (
    <div className="space-y-3">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center gap-2 border-b border-border bg-surface px-4 py-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && step(e.shiftKey ? -1 : 1)}
          placeholder="이 규범 본문에서 찾기"
          aria-label="이 규범 본문에서 찾기"
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm"
        />
        <span className="tnum shrink-0 text-xs text-muted" aria-live="polite">
          {re ? `${matches.length ? cur + 1 : 0}/${matches.length}개 조문` : `${rows.filter((r) => r[0]).length}개 조문`}
        </span>
        <button type="button" onClick={() => step(-1)} disabled={!matches.length} className="rounded border border-border px-1.5 text-sm disabled:opacity-40" aria-label="이전 일치 조문">
          ↑
        </button>
        <button type="button" onClick={() => step(1)} disabled={!matches.length} className="rounded border border-border px-1.5 text-sm disabled:opacity-40" aria-label="다음 일치 조문">
          ↓
        </button>
      </div>
      <div ref={box} className="space-y-3">
        {rows.map((r, i) => {
          const hit = re ? matches.includes(i) : false;
          if (!r[0])
            return (
              <h4 key={i} data-row={i} className="scroll-mt-14 pt-2 text-sm font-bold">
                {r[2]}
              </h4>
            );
          return (
            <section key={i} data-row={i} className={`scroll-mt-14 rounded-md px-2 py-1.5 ${hit ? 'bg-case-bg/60' : ''} ${focusIndex === i ? 'ring-2 ring-case/50' : ''}`}>
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {highlightParts(formatArticle(r[2]), re ? q : undefined).map((p, k) =>
                  p.hit ? (
                    <mark key={k} className="rounded-sm bg-case/25 px-0.5 text-inherit">
                      {p.t}
                    </mark>
                  ) : (
                    <span key={k}>{p.t}</span>
                  ),
                )}
              </p>
              {norm.source === 'law' && (
                <a href={lawArticleUrl(norm.title, r[0])} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline">
                  {r[0]} 원문 ↗
                </a>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted">본문은 국가법령정보센터 수집본이며, 법적 효력은 원문에 있습니다.</p>
    </div>
  );
}
