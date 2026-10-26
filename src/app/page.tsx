import Link from 'next/link';
import { Suspense } from 'react';
import { getCases, getChanges, getMeta, getNorms } from '@/lib/data';
import { getBook } from '@/lib/book';
import { CASE_LABELS, FIELD_NAMES } from '@/lib/labels';
import { caseSlug, fmtDate } from '@/lib/format';
import { CASE_SOURCES } from '@/types/model';
import { Icicle } from '@/components/tree/Icicle';
import { ChangeList } from '@/components/common/ChangeList';
import { RegulationBook } from '@/components/common/RegulationBook';

export default function Home() {
  const meta = getMeta();
  const norms = getNorms();
  const cases = getCases();
  const changes = getChanges().entries.slice(0, 5);
  const sidoCount = new Set(norms.filter((n) => n.source === 'ordin' && n.region).map((n) => n.region!.sido)).size;
  const c = meta.counts;
  const book = getBook();

  const cards = [
    { href: '/list/?source=law', label: '법령·행정규칙', n: c.norms.law + c.norms.admrul + c.norms.trty, sub: '헌법·조약·법률·시행령·고시' },
    { href: '/local/', label: '자치법규(조례)', n: c.norms.ordin, sub: `${sidoCount}개 시·도` },
    { href: '/list/?source=pi', label: '기관규정', n: c.norms.pi, sub: '정관·규정·시행규칙·지침' },
    { href: '/cases/', label: '판례·해석', n: c.cases.total, sub: `검수 대기 ${c.cases.candidate}건 비노출` },
  ];

  return (
    <div className="space-y-10">
      <section aria-labelledby="tree-h">
        <h1 id="tree-h" className="sr-only">
          대한적십자사 법규 체계도
        </h1>
        <Suspense>
          <Icicle />
        </Suspense>
      </section>

      <section aria-labelledby="sum-h" className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 id="sum-h" className="mb-3 font-bold">
            축별 요약
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((k) => (
              <Link key={k.href} href={k.href} className="rounded-xl border border-border bg-surface p-4 hover:border-text">
                <div className="text-sm text-muted">{k.label}</div>
                <div className="tnum text-3xl font-bold">{k.n}</div>
                <div className="text-xs text-muted">{k.sub}</div>
              </Link>
            ))}
          </div>
        </div>
        <aside aria-labelledby="lib-h" className="rounded-xl border border-border bg-surface p-4">
          <h2 id="lib-h" className="mb-3 font-bold">
            📚 판례·해석 도서관
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {CASE_SOURCES.map((s) => (
              <li key={s}>
                <Link href={`/cases/?type=${s}`} className="flex justify-between hover:underline">
                  <span>
                    <span aria-hidden>{CASE_LABELS[s].icon}</span> {CASE_LABELS[s].short}
                  </span>
                  <span className="tnum text-muted">{c.cases[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 mb-2 text-xs font-semibold text-muted">최근 선고·결정</h3>
          <ul className="space-y-2 text-sm">
            {cases.slice(0, 3).map((x) => (
              <li key={x.id}>
                <Link href={`/cases/${caseSlug(x.id)}/`} className="line-clamp-2 hover:underline">
                  {x.title}
                </Link>
                <span className="tnum text-xs text-muted">{fmtDate(x.decidedAt)}</span>
              </li>
            ))}
          </ul>
          <Link href="/cases/" className="mt-4 block rounded-md border border-border px-3 py-1.5 text-center text-sm hover:bg-surface-2">
            전체 보기 →
          </Link>
        </aside>
      </section>

      <section aria-labelledby="field-h">
        <h2 id="field-h" className="mb-3 font-bold">
          업무분야
        </h2>
        <ul className="flex flex-wrap gap-2">
          {Object.entries(FIELD_NAMES).map(([code, name]) => (
            <li key={code}>
              <Link href={`/field/${code}/`} className="block rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-text">
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="book-h">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="book-h" className="font-bold">
            대한적십자사 법규집 <span className="text-sm font-normal text-muted">법령 · 정관 · 운영규정 · 시행규칙 · 기타규칙 · 유관법령 · 폐지규정</span>
          </h2>
          <Link href="/tree/" className="text-sm underline">
            상하 관계로 보기(트리 목록)
          </Link>
        </div>
        <RegulationBook {...book} />
      </section>

      <section aria-labelledby="chg-h">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="chg-h" className="font-bold">
            최근 변경
          </h2>
          <Link href="/changes/" className="text-sm underline">
            전체 보기
          </Link>
        </div>
        <ChangeList entries={changes} />
      </section>
    </div>
  );
}
