import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCases } from '@/lib/data';
import { caseSlug, fmtDate, slugToCaseId } from '@/lib/format';
import { CASE_LABELS } from '@/lib/labels';
import { CaseBody } from '@/components/common/DetailPanel';
import { CaseTypeChip, DemoTag, Relevance, ReviewTag } from '@/components/common/Chips';

export const dynamicParams = false;

export function generateStaticParams() {
  const cases = getCases();
  // 정적 export 는 최소 1개 경로가 필요하다 — 자료가 없을 때는 안내 페이지 하나를 만든다
  return cases.length ? cases.map((c) => ({ id: caseSlug(c.id) })) : [{ id: 'none' }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = getCases().find((x) => x.id === slugToCaseId(id));
  return { title: c ? `${c.title} (${c.docNo})` : '판례·해석', description: c?.summary?.slice(0, 120) };
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCases().find((x) => x.id === slugToCaseId(id));
  if (!c) {
    if (id === 'none') return <p className="text-muted">수집된 판례·해석이 없습니다.</p>;
    notFound();
  }
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <nav className="text-sm text-muted">
        <Link href="/cases/" className="underline">
          판례·해석
        </Link>{' '}
        › {CASE_LABELS[c.source].name}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <CaseTypeChip c={c} />
        <ReviewTag c={c} />
        {c.demo && <DemoTag />}
        <Relevance value={c.relevance} />
      </div>
      <h1 className="text-2xl font-bold leading-snug">{c.title}</h1>
      <p className="tnum text-muted">
        {c.issuer} · {c.docNo} · {fmtDate(c.decidedAt)}
      </p>
      <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-text px-4 py-2 font-semibold text-bg">
        원문 보기 ↗
      </a>
      <div className="rounded-xl border border-border bg-surface p-4">
        <CaseBody c={c} />
      </div>
    </article>
  );
}
