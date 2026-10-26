'use client';
// 대한적십자사 법규집 편제 (I 법령 ~ VII 폐지규정) — 법규집과 같은 순서·순번(편마다 1부터), 2단 배치
// I~IV: law.go.kr 수집본과 연결(상세·원문·⚖) + 법규집 뷰어 링크 / V~VII: 법규집에만 있는 항목 → 법규집 뷰어로
import type { BookLaw, NormItem } from '@/types/model';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { CaseBadge, StatusBadges } from './Chips';

export interface BookItem {
  no: number;
  label: string;
  norm?: NormItem;
  english?: boolean;
  krcUrl?: string; // 법규집 뷰어
  note?: string; // 법규집에 적힌 개정·폐지 정보
  krcOnly?: boolean; // 법규집에만 있는 편(V~VII)
  latest?: BookLaw & { newer: boolean }; // 유관법령의 최신 법령(국가법령정보센터)
}

export interface BookGroup {
  no: string; // I, II …
  title: string;
  items: BookItem[];
}

function KrcLink({ it }: { it: BookItem }) {
  if (!it.krcUrl) return null;
  return (
    <a
      href={it.krcUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted hover:text-text"
      aria-label={`${it.label} 대한적십자사 법규집에서 보기 (새 탭)`}
      title="대한적십자사 법규집(law.redcross.or.kr)에서 보기"
    >
      법규집↗
    </a>
  );
}

export function RegulationBook({ groups, source, checkedAt }: { groups: BookGroup[]; source: string; checkedAt: string }) {
  const { openDetail, normById } = useStore();
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 md:p-6">
      <div className="columns-1 gap-10 lg:columns-2 [column-rule:1px_solid_var(--border)]">
        {groups.map((g) => (
          <section key={g.no} id={`book-${g.no}`} className="mb-6 scroll-mt-28">
            <h3 className="mb-2 flex items-baseline gap-2 border-b-2 border-text pb-1 font-bold break-after-avoid">
              <span className="text-muted">{g.no}.</span> {g.title}
              <span className="tnum ml-auto text-xs font-normal text-muted">{g.items.length}건</span>
            </h3>
            <ol>
              {g.items.map((it) => {
                const n = it.norm;
                const parent = n?.source === 'pi' && n.level === 'L5_RULE' && n.parentId ? normById.get(n.parentId) : undefined;
                const repealed = /폐지/.test(it.note ?? '') || g.title === '폐지규정';
                return (
                  <li key={`${g.no}-${it.no}`} className="group flex break-inside-avoid items-start gap-2 border-b border-border/60 py-1.5 text-sm">
                    <span className="tnum w-7 shrink-0 pt-0.5 text-right text-xs text-muted">{it.no}.</span>
                    <div className="min-w-0 flex-1">
                      {n ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <button type="button" onClick={() => openDetail(n.id)} className="text-left font-medium hover:underline">
                              {it.label}
                            </button>
                            <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-text" aria-label={`${it.label} 원문 (새 탭)`}>
                              원문↗
                            </a>
                            <KrcLink it={it} />
                            <StatusBadges norm={{ ...n, flags: n.flags.filter((f) => f !== 'NO_PARENT') }} />
                            <CaseBadge norm={n} />
                          </div>
                          <p className="tnum text-xs text-muted">
                            시행 {fmtDate(n.effectiveAt)}
                            {it.note ? ` · 법규집 ${it.note}` : ''}
                            {parent && parent.level !== 'L3_ARTICLES' ? ` · 상위: ${parent.shortTitle ?? parent.title}` : ''}
                          </p>
                        </>
                      ) : it.krcOnly ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {it.krcUrl ? (
                              <a href={it.krcUrl} target="_blank" rel="noopener noreferrer" className={`font-medium hover:underline ${repealed ? 'text-muted' : ''}`}>
                                {it.label}
                              </a>
                            ) : (
                              <span className="font-medium">{it.label}</span>
                            )}
                            <span className="text-xs text-muted" aria-hidden>
                              ↗ 법규집
                            </span>
                            {repealed && <span className="rounded bg-surface-2 px-1.5 text-[11px] text-muted">폐지</span>}
                          </div>
                          {it.note && (
                            <p className="tnum text-xs text-muted">
                              {it.latest ? '법규집 수록본: ' : ''}
                              {it.note}
                            </p>
                          )}
                          {it.latest && (
                            <p className="tnum mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
                              <span className="text-muted">최신 법령:</span>
                              <a href={it.latest.url} target="_blank" rel="noopener noreferrer" className="font-medium text-law hover:underline" aria-label={`${it.latest.name} 최신 법령 원문 (새 탭)`}>
                                {it.latest.name} 원문↗
                              </a>
                              <span className="text-muted">
                                시행 {fmtDate(it.latest.effectiveAt)} ({fmtDate(it.latest.promulgatedAt)} {it.latest.revisionType})
                              </span>
                              {it.latest.newer && (
                                <span className="rounded bg-case-bg px-1.5 font-semibold text-case" title="법규집 수록본 이후에 개정된 법령입니다. 최신 조문은 국가법령정보센터 원문에서 확인하세요.">
                                  법규집 이후 개정
                                </span>
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <span className="text-muted" title="국가법령정보센터(law.go.kr) 미등재 — 대한적십자사 법규집에서 확인">
                            {it.label} <span className="text-xs">({it.english ? '영문본 · ' : ''}law.go.kr 미등재)</span>
                          </span>
                          <KrcLink it={it} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        편제·순서·순번: 대한적십자사 법규집(
        <a className="underline" href={source} target="_blank" rel="noopener noreferrer">
          {source.replace(/^https?:\/\//, '')}
        </a>
        , {fmtDate(checkedAt)} 확인) · I~IV 내용·시행일: 국가법령정보센터 수집본 · V~VII: 법규집에만 수록(법규집 뷰어로 연결)
      </p>
    </div>
  );
}
