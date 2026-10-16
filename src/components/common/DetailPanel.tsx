'use client';
// 공통 상세 패널 (설계서 7.7) — 데스크톱 우측 사이드 / 모바일 바텀시트
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CaseItem, NormItem } from '@/types/model';
import { useCases, useStore, type DetailTab } from '@/lib/store';
import { BUNDLE_NAMES, CASE_LABELS, LEVEL_NAMES } from '@/lib/labels';
import { caseSlug, fmtDate } from '@/lib/format';
import { lawArticleUrl } from '@/lib/links';
import { CaseBadge, CaseTypeChip, DemoTag, ExtLink, FieldChip, KindChip, Relevance, ReviewTag, StatusBadges } from './Chips';

function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
      onClick={async () => {
        const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
        try {
          await navigator.clipboard.writeText(`${location.origin}${base}${path}`);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* 클립보드 권한 없음 */
        }
      }}
    >
      {done ? '복사됨' : '링크 복사'}
    </button>
  );
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${value === t.id ? 'border-text font-semibold' : 'border-transparent text-muted hover:text-text'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-border/60 py-2 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function CaseMini({ c, article }: { c: CaseItem; article?: string }) {
  return (
    <li className="rounded-md border border-border p-3">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <CaseTypeChip c={c} />
        <span className="tnum text-xs text-muted">
          {c.issuer} · {fmtDate(c.decidedAt)}
        </span>
        <ReviewTag c={c} />
        {c.demo && <DemoTag />}
      </div>
      <Link href={`/cases/${caseSlug(c.id)}/`} className="font-medium hover:underline">
        {c.title}
      </Link>
      <p className="tnum text-xs text-muted">
        {c.docNo}
        {article ? ` · ${article} 인용` : ''}
      </p>
    </li>
  );
}

function NormDetail({ norm, initialTab, initialArticle }: { norm: NormItem; initialTab?: DetailTab; initialArticle?: string }) {
  const { relations, normById, childrenOf, openDetail } = useStore();
  const [tab, setTab] = useState<DetailTab>(initialTab ?? 'overview');
  const [article, setArticle] = useState<string | undefined>(initialArticle);
  const cases = useCases(tab === 'cases' || norm.caseCount > 0);
  const rels = useMemo(() => relations.filter((r) => r.to === norm.id), [relations, norm.id]);
  const parent = norm.parentId ? normById.get(norm.parentId) : undefined;
  const children = (childrenOf.get(norm.id) ?? []).filter((c) => c.source !== 'ordin');
  const ordinances = (childrenOf.get(norm.id) ?? []).filter((c) => c.source === 'ordin');

  // 조문 목차: 수집된 목차 우선, 없으면 판례·해석이 인용한 조문
  const articleCounts = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of rels) if (r.article) (m.get(r.article) ?? m.set(r.article, new Set()).get(r.article)!).add(r.from);
    return m;
  }, [rels]);
  const articles = norm.articles?.length
    ? norm.articles
    : [...articleCounts.keys()].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).map((no) => ({ no, title: '' }));

  const related = useMemo(() => {
    if (!cases) return [];
    const ids = new Set(rels.filter((r) => !article || r.article === article).map((r) => r.from));
    return cases.filter((c) => ids.has(c.id));
  }, [cases, rels, article]);

  const tabs: { id: DetailTab; label: string }[] = [{ id: 'overview', label: '개요' }];
  if (norm.source === 'law' && articles.length) tabs.push({ id: 'articles', label: '조문 목차' });
  tabs.push({ id: 'cases', label: `관련 판례·해석 ⚖ ${norm.caseCount}` });
  if (norm.source === 'law' && ordinances.length) tabs.push({ id: 'ordinances', label: `관련 조례 ${ordinances.length}` });

  const isLaw = norm.source === 'law';
  const parentLaw = norm.source === 'ordin' && parent ? parent : undefined;
  const needsReview = parentLaw?.effectiveAt && norm.effectiveAt && parentLaw.effectiveAt > norm.effectiveAt;

  return (
    <>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <KindChip norm={norm} />
          <StatusBadges norm={norm} />
          <CaseBadge norm={norm} />
        </div>
        <h2 id="detail-title" className="text-lg font-bold leading-snug">
          {norm.title}
        </h2>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={norm.url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-text px-3 py-1.5 text-sm font-semibold text-bg hover:opacity-90">
            원문 보기 ↗
          </a>
          <CopyLink path={`/tree/?focus=${encodeURIComponent(norm.id)}`} />
          {norm.source !== 'ordin' ? (
            <Link href={`/tree/?focus=${encodeURIComponent(norm.id)}`} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
              트리에서 위치 보기
            </Link>
          ) : (
            <Link href={`/local/?sido=${encodeURIComponent(norm.region?.sido ?? '')}`} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
              지역뷰에서 보기
            </Link>
          )}
        </div>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && (
          <dl>
            <Row k="구분">{LEVEL_NAMES[norm.level]} · {norm.kind}</Row>
            <Row k={norm.source === 'ordin' ? '지자체' : '소관'}>{norm.agency || '—'}</Row>
            {norm.region && <Row k="지역">{[norm.region.sido, norm.region.sigungu].filter(Boolean).join(' ')}{norm.bundle ? ` · ${BUNDLE_NAMES[norm.bundle]} 묶음` : ''}</Row>}
            <Row k="공포">{fmtDate(norm.promulgatedAt)}</Row>
            <Row k="시행">
              <span className="tnum">{fmtDate(norm.effectiveAt)}</span>
              {norm.upcoming && <span className="ml-2 text-law">시행 예정 {fmtDate(norm.upcoming.effectiveAt)}</span>}
            </Row>
            {norm.revisionType && <Row k="제개정">{norm.revisionType}</Row>}
            <Row k="분야">
              <span className="flex flex-wrap gap-1">
                {[norm.primaryField, ...norm.secondaryFields].map((f) => (
                  <FieldChip key={f} code={f} />
                ))}
              </span>
            </Row>
            <Row k="상위 근거">
              {parent ? (
                <button type="button" className="text-left hover:underline" onClick={() => openDetail(parent.id)}>
                  {parent.title}
                </button>
              ) : (
                '—'
              )}
            </Row>
            {needsReview && (
              <Row k="정비 검토">
                <span className="text-case">상위 법령 시행일({fmtDate(parentLaw!.effectiveAt)})이 조례 시행일보다 최근입니다. (정보 제공용, 판정 아님)</span>
              </Row>
            )}
            {children.length > 0 && (
              <Row k="하위 규범">
                <ul className="space-y-1">
                  {children.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="text-left hover:underline" onClick={() => openDetail(c.id)}>
                        {c.shortTitle ?? c.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </Row>
            )}
          </dl>
        )}
        {tab === 'articles' && (
          <ul className="divide-y divide-border/60">
            {articles.map((a) => {
              const n = articleCounts.get(a.no)?.size ?? 0;
              return (
                <li key={a.no} className="flex items-center gap-2 py-2 text-sm">
                  <ExtLink href={lawArticleUrl(norm.title, a.no)} className="tnum font-medium">
                    {a.no}
                  </ExtLink>
                  <span className="flex-1 text-muted">{a.title}</span>
                  {n > 0 && (
                    <button
                      type="button"
                      className="tnum rounded-full border border-case/40 bg-case-bg px-2 py-0.5 text-xs font-semibold text-case"
                      onClick={() => {
                        setArticle(a.no);
                        setTab('cases');
                      }}
                      aria-label={`${a.no}을 인용한 판례·해석 ${n}건`}
                    >
                      ⚖ {n}
                    </button>
                  )}
                </li>
              );
            })}
            {!norm.articles?.length && <li className="py-2 text-xs text-muted">조문 목차 수집 전 — 판례·해석이 인용한 조문만 표시합니다.</li>}
          </ul>
        )}
        {tab === 'cases' && (
          <div className="space-y-3">
            {articleCounts.size > 0 && (
              <label className="flex items-center gap-2 text-sm">
                조문
                <select className="rounded border border-border bg-surface px-2 py-1" value={article ?? ''} onChange={(e) => setArticle(e.target.value || undefined)}>
                  <option value="">전체</option>
                  {[...articleCounts.keys()].map((a) => (
                    <option key={a} value={a}>
                      {a} ({articleCounts.get(a)!.size})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!cases && <p className="text-sm text-muted">불러오는 중…</p>}
            {cases && related.length === 0 && <p className="text-sm text-muted">연결된 판례·해석이 없습니다.</p>}
            {(Object.keys(CASE_LABELS) as (keyof typeof CASE_LABELS)[]).map((src) => {
              const list = related.filter((c) => c.source === src);
              if (!list.length) return null;
              return (
                <section key={src}>
                  <h3 className="mb-2 text-sm font-semibold">
                    {CASE_LABELS[src].name} <span className="tnum text-muted">{list.length}</span>
                  </h3>
                  <ul className="space-y-2">
                    {list.map((c) => (
                      <CaseMini key={c.id} c={c} article={rels.find((r) => r.from === c.id && r.article)?.article} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        {tab === 'ordinances' && (
          <ul className="space-y-1 text-sm">
            {ordinances.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 py-1">
                <button type="button" className="text-left hover:underline" onClick={() => openDetail(o.id)}>
                  {o.title}
                </button>
                {o.demo && <DemoTag />}
              </li>
            ))}
            <li className="pt-2">
              <Link className="text-sm underline" href="/local/">
                지역뷰에서 보기 →
              </Link>
            </li>
          </ul>
        )}
      </div>
    </>
  );
}

function CaseDetail({ c }: { c: CaseItem }) {
  return (
    <>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <CaseTypeChip c={c} />
          <ReviewTag c={c} />
          {c.demo && <DemoTag />}
          <Relevance value={c.relevance} />
        </div>
        <h2 id="detail-title" className="text-lg font-bold leading-snug">
          {c.title}
        </h2>
        <p className="tnum text-sm text-muted">
          {c.issuer} · {c.docNo} · {fmtDate(c.decidedAt)}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-text px-3 py-1.5 text-sm font-semibold text-bg">
            원문 보기 ↗
          </a>
          <Link href={`/cases/${caseSlug(c.id)}/`} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
            상세 페이지
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <CaseBody c={c} />
      </div>
    </>
  );
}

/** 판례·해석 본문 (패널·상세 페이지 공용) */
export function CaseBody({ c }: { c: CaseItem }) {
  const { normById, openDetail } = useStore();
  const cases = useCases();
  const same = useMemo(
    () => (cases ?? []).filter((x) => x.id !== c.id && x.issueTags.some((t) => c.issueTags.includes(t))).slice(0, 8),
    [cases, c],
  );
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold">개요</h3>
        <dl>
          <Row k="유형">{CASE_LABELS[c.source].name}</Row>
          <Row k="문서번호"><span className="tnum">{c.docNo}</span></Row>
          <Row k="기관">{c.issuer}</Row>
          <Row k="일자"><span className="tnum">{fmtDate(c.decidedAt)}</span></Row>
          {c.outcome && <Row k="결과">{c.outcome}</Row>}
          <Row k="분야">
            <span className="flex flex-wrap gap-1">{c.fields.map((f) => <FieldChip key={f} code={f} />)}</span>
          </Row>
          {c.issueTags.length > 0 && (
            <Row k="쟁점">
              <span className="flex flex-wrap gap-1">
                {c.issueTags.map((t) => (
                  <Link key={t} href={`/cases/?tag=${encodeURIComponent(t)}`} className="rounded-full bg-case-bg px-2 py-0.5 text-xs text-case hover:underline">
                    #{t}
                  </Link>
                ))}
              </span>
            </Row>
          )}
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">요지</h3>
        {c.summary ? (
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {c.summary}{' '}
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-muted underline">
              원문에서 계속 ↗
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted">요지 없음 — 원문을 확인하세요.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">관련 규범</h3>
        {c.citedLaws.length === 0 && <p className="text-sm text-muted">파싱된 참조조문 없음</p>}
        <ul className="space-y-1.5 text-sm">
          {c.citedLaws.map((cl, i) => {
            const n = cl.normId ? normById.get(cl.normId) : undefined;
            return (
              <li key={i} className="flex flex-wrap items-center gap-2">
                {n ? (
                  <button type="button" className="font-medium hover:underline" onClick={() => openDetail(n.id, { tab: 'cases', article: cl.article })}>
                    {n.title}
                  </button>
                ) : (
                  <span>{cl.lawName}</span>
                )}
                {cl.article && <ExtLink href={lawArticleUrl(cl.lawName, cl.article)} className="tnum text-muted">{cl.article}</ExtLink>}
                {n && (
                  <Link href={`/tree/?focus=${encodeURIComponent(n.id)}`} className="text-xs text-muted underline">
                    트리 위치
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {same.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">같은 쟁점</h3>
          <ul className="space-y-2">{same.map((x) => <CaseMini key={x.id} c={x} />)}</ul>
        </section>
      )}
    </div>
  );
}

export function DetailPanel() {
  const { detail, closeDetail, normById } = useStore();
  const cases = useCases(!!detail && !normById.has(detail.id));
  const ref = useRef<HTMLDivElement>(null);
  const norm = detail ? normById.get(detail.id) : undefined;
  const c = detail && !norm ? cases?.find((x) => x.id === detail.id) : undefined;

  useEffect(() => {
    if (!detail) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDetail();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, closeDetail]);

  if (!detail) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 xl:hidden" onClick={closeDetail} aria-hidden />
      <aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="detail-title"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border border-border bg-surface shadow-2xl outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none md:border-y-0 md:border-r-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs text-muted">상세</span>
          <button type="button" onClick={closeDetail} className="rounded px-2 py-1 text-sm hover:bg-surface-2" aria-label="상세 패널 닫기">
            닫기 ✕
          </button>
        </div>
        {norm && <NormDetail key={`${norm.id}-${detail.tab}-${detail.article}`} norm={norm} initialTab={detail.tab} initialArticle={detail.article} />}
        {c && <CaseDetail c={c} />}
        {!norm && !c && <p className="p-4 text-sm text-muted">{cases ? '항목을 찾을 수 없습니다.' : '불러오는 중…'}</p>}
      </aside>
    </>
  );
}
