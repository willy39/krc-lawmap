import Link from 'next/link';
import { Suspense } from 'react';
import { getCases, getChanges, getMeta, getNorms, getOfficialOrder } from '@/lib/data';
import type { NormItem } from '@/types/model';
import { CASE_LABELS, FIELD_NAMES } from '@/lib/labels';
import { caseSlug, fmtDate } from '@/lib/format';
import { CASE_SOURCES } from '@/types/model';
import { Icicle } from '@/components/tree/Icicle';
import { ChangeList } from '@/components/common/ChangeList';
import { RegulationBook, type BookGroup } from '@/components/common/RegulationBook';

export default function Home() {
  const meta = getMeta();
  const norms = getNorms();
  const cases = getCases();
  const changes = getChanges().entries.slice(0, 5);
  const sidoCount = new Set(norms.filter((n) => n.source === 'ordin' && n.region).map((n) => n.region!.sido)).size;
  const c = meta.counts;
  // 법규집 편제: 법규집 순서대로 우리 수집본과 매칭, 법규집에 없는 수집본은 해당 편 끝에
  const order = getOfficialOrder();
  const key = (t: string) => t.replace(/\s/g, '');
  const alias = (t: string) => order.aliases[t] ?? t;
  const pis = norms.filter((n) => n.source === 'pi');
  const used = new Set<string>();
  const find = (title: string, pool: NormItem[]) => {
    const n = pool.find((x) => !used.has(x.id) && key(alias(x.title)) === key(title));
    if (n) used.add(n.id);
    return n;
  };
  const shorten = (t: string) => t.replace(/^대한적십자사\s+(?!조직법)/, '');
  // 순번: 대한적십자사 법규집처럼 편마다 1부터. 영문본(law.go.kr 미등재)도 법규집 순번을 차지하므로 자리를 지킨다
  const book: BookGroup[] = (
    [
      ['I', '법령', order.groups.법령, norms.filter((n) => n.level === 'L1_ACT' || n.level === 'L2_DECREE'), null],
      ['II', '정관', order.groups.정관, pis, 'L3_ARTICLES'],
      ['III', '운영규정', order.groups.운영규정, pis, 'L4_REGULATION'],
      ['IV', '시행규칙', order.groups.시행규칙, pis, 'L5_RULE'],
    ] as const
  ).map(([gno, title, names, pool, level]) => {
    let no = 0;
    const items: BookGroup['items'] = names.map((t) => {
      const english = /^[A-Z]/.test(t);
      const n = english ? undefined : find(t, pool as NormItem[]);
      return { no: ++no, label: english ? t : shorten(n?.title ?? t), norm: n, english };
    });
    // 법규집에 없는 수집본(예: law.go.kr 에만 남은 옛 명칭)은 그 편 끝에 이어 붙인다
    const rest = (pool as NormItem[]).filter((x) => !used.has(x.id) && (level ? x.level === level || (level === 'L5_RULE' && x.level === 'L6_GUIDELINE') : true));
    for (const n of rest) {
      used.add(n.id);
      items.push({ no: ++no, label: shorten(n.title), norm: n, extra: true });
    }
    return { no: gno, title, items };
  });

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
            대한적십자사 법규집 <span className="text-sm font-normal text-muted">법령 · 정관 · 운영규정 · 시행규칙</span>
          </h2>
          <Link href="/tree/" className="text-sm underline">
            상하 관계로 보기(체계트리)
          </Link>
        </div>
        <RegulationBook groups={book} source={order.source} checkedAt={order.checkedAt} />
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
