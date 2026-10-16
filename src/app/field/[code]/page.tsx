import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCases, getNorms, getRegions } from '@/lib/data';
import { CASE_LABELS, FIELD_NAMES } from '@/lib/labels';
import { FIELD_CODES, type FieldCode } from '@/types/model';
import { FieldNormList } from '@/components/common/FieldNormList';
import { CaseCard } from '@/components/cases/CaseCard';

export const dynamicParams = false;
export function generateStaticParams() {
  return FIELD_CODES.map((code) => ({ code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: FIELD_NAMES[code as FieldCode] ?? '분야' };
}

export default async function FieldPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  if (!FIELD_CODES.includes(raw as FieldCode)) notFound();
  const code = raw as FieldCode;
  const inField = (f: FieldCode, s: FieldCode[]) => f === code || s.includes(code);
  const norms = getNorms().filter((n) => inField(n.primaryField, n.secondaryFields));
  const regs = norms.filter((n) => n.source !== 'ordin');
  const ords = norms.filter((n) => n.source === 'ordin');
  const cases = getCases().filter((c) => c.fields.includes(code));
  const regions = getRegions();
  const perSido = new Map<string, number>();
  for (const o of ords) if (o.region) perSido.set(o.region.sido, (perSido.get(o.region.sido) ?? 0) + 1);
  const typeCounts = Object.entries(CASE_LABELS)
    .map(([s, l]) => ({ name: l.name, n: cases.filter((c) => c.source === s).length }))
    .filter((x) => x.n);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted">업무분야 · {code}</p>
        <h1 className="text-2xl font-bold">{FIELD_NAMES[code]}</h1>
      </div>
      <section>
        <h2 className="mb-2 font-bold">
          규범 <span className="tnum text-muted">{regs.length}</span>
        </h2>
        <FieldNormList norms={regs} />
      </section>
      <section>
        <h2 className="mb-2 font-bold">
          조례 <span className="tnum text-muted">{ords.length}</span>
        </h2>
        {ords.length ? (
          <>
            <ul className="mb-2 grid grid-cols-6 gap-1 sm:grid-cols-9 lg:grid-cols-17" aria-label="지역 분포">
              {regions.map((r) => {
                const n = perSido.get(r.sido) ?? 0;
                return (
                  <li key={r.code} className={`rounded px-1 py-1 text-center text-xs ${n ? 'bg-local-bg text-local font-semibold' : 'bg-surface-2 text-muted'}`} title={`${r.sido} ${n}건`}>
                    {r.short}
                    <span className="tnum block">{n}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/local/" className="text-sm underline">
              지역뷰에서 보기 →
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">해당 분야 조례가 없습니다.</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-bold">
          판례·해석 <span className="tnum text-muted">{cases.length}</span>
        </h2>
        <p className="mb-3 text-sm text-muted">{typeCounts.map((t) => `${t.name} ${t.n}`).join(' · ') || '연결된 자료 없음'}</p>
        <div className="space-y-3">
          {cases.slice(0, 5).map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
        {cases.length > 5 && (
          <Link href={`/cases/?field=${code}`} className="mt-3 inline-block text-sm underline">
            전체 {cases.length}건 보기 →
          </Link>
        )}
      </section>
    </div>
  );
}
