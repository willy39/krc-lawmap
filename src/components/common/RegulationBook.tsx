'use client';
// 법규집 편제 (I 법령 → II 정관 → III 운영규정 → IV 시행규칙) — 대한적십자사 법규집과 같은 순서·연속 번호, 2단 배치
import type { NormItem } from '@/types/model';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { CaseBadge, StatusBadges } from './Chips';

export interface BookGroup {
  no: string; // I, II …
  title: string;
  items: { no: number; label: string; norm?: NormItem; english?: boolean; extra?: boolean }[];
}

export function RegulationBook({ groups, source, checkedAt }: { groups: BookGroup[]; source: string; checkedAt: string }) {
  const { openDetail, normById } = useStore();
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 md:p-6">
      <div className="columns-1 gap-10 lg:columns-2 [column-rule:1px_solid_var(--border)]">
        {groups.map((g) => (
          <section key={g.no} className="mb-6">
            <h3 className="mb-2 flex items-baseline gap-2 border-b-2 border-text pb-1 font-bold break-after-avoid">
              <span className="text-muted">{g.no}.</span> {g.title}
              <span className="tnum ml-auto text-xs font-normal text-muted">{g.items.length}건</span>
            </h3>
            <ol>
              {g.items.map((it) => {
                const n = it.norm;
                const parent = n?.source === 'pi' && n.level === 'L5_RULE' && n.parentId ? normById.get(n.parentId) : undefined;
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
                            <StatusBadges norm={{ ...n, flags: n.flags.filter((f) => f !== 'NO_PARENT') }} />
                            <CaseBadge norm={n} />
                            {it.extra && (
                              <span className="rounded border border-dashed border-border px-1 text-[11px] text-muted" title="국가법령정보센터에는 있으나 대한적십자사 법규집 목록에는 없음">
                                법규집 미수록
                              </span>
                            )}
                          </div>
                          <p className="tnum text-xs text-muted">
                            시행 {fmtDate(n.effectiveAt)}
                            {parent && parent.level !== 'L3_ARTICLES' ? ` · 상위: ${parent.shortTitle ?? parent.title}` : ''}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted" title="국가법령정보센터(law.go.kr) 미등재 — 대한적십자사 법규집에서 확인">
                          {it.label} <span className="text-xs">({it.english ? '영문본 · ' : ''}law.go.kr 미등재)</span>
                        </span>
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
        , {fmtDate(checkedAt)} 확인) · 내용·시행일: 국가법령정보센터 수집본
      </p>
    </div>
  );
}
