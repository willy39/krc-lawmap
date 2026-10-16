'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { CaseItem } from '@/types/model';
import { caseSlug, fmtDate } from '@/lib/format';
import { lawArticleUrl } from '@/lib/links';
import { useStore } from '@/lib/store';
import { CaseTypeChip, DemoTag, FieldChip, Relevance, ReviewTag } from '@/components/common/Chips';

export function CaseCard({ c }: { c: CaseItem }) {
  const { normById, openDetail } = useStore();
  const [copied, setCopied] = useState(false);
  const linked = c.citedLaws.filter((l) => l.normId);
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <CaseTypeChip c={c} />
        <span className="tnum text-sm text-muted">
          {c.issuer} {c.docNo} · {fmtDate(c.decidedAt)}
        </span>
        <ReviewTag c={c} />
        {c.demo && <DemoTag />}
        <span className="ml-auto">
          <Relevance value={c.relevance} />
        </span>
      </div>
      <h3 className="font-semibold">
        <Link href={`/cases/${caseSlug(c.id)}/`} className="hover:underline">
          {c.title}
        </Link>
      </h3>
      <div className="mt-1 flex flex-wrap gap-1">
        {c.fields.map((f) => (
          <FieldChip key={f} code={f} />
        ))}
        {c.issueTags.map((t) => (
          <Link key={t} href={`/cases/?tag=${encodeURIComponent(t)}`} className="rounded-full bg-case-bg px-2 py-0.5 text-xs text-case hover:underline">
            #{t}
          </Link>
        ))}
      </div>
      {c.summary && <p className="mt-2 line-clamp-2 text-sm text-muted">{c.summary}</p>}
      {linked.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="text-muted">관련 규범: </span>
          {linked.map((l, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <button type="button" className="hover:underline" onClick={() => openDetail(l.normId!, { tab: 'cases', article: l.article })}>
                {normById.get(l.normId!)?.shortTitle ?? l.lawName}
              </button>
              {l.article && (
                <a href={lawArticleUrl(l.lawName, l.article)} target="_blank" rel="noopener noreferrer" className="tnum ml-1 text-muted hover:underline">
                  {l.article}↗
                </a>
              )}
            </span>
          ))}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-2.5 py-1 hover:bg-surface-2">
          원문 ↗
        </a>
        <button type="button" onClick={() => openDetail(c.id)} className="rounded-md border border-border px-2.5 py-1 hover:bg-surface-2">
          관련 규범 보기
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2.5 py-1 hover:bg-surface-2"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/cases/${caseSlug(c.id)}/`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* noop */
            }
          }}
        >
          {copied ? '복사됨' : '링크 복사'}
        </button>
      </div>
    </article>
  );
}
