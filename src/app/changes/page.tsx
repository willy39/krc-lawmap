import type { Metadata } from 'next';
import { getChanges } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { ChangeList } from '@/components/common/ChangeList';

export const metadata: Metadata = { title: '최근 변경' };

export default function ChangesPage() {
  const ch = getChanges();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">최근 변경</h1>
        <p className="tnum text-sm text-muted">
          규범 개정·추가·폐지와 신규 판례·해석 · 직전 수집 {fmtDate(ch.previousGeneratedAt?.slice(0, 10))} → 이번 수집 {fmtDate(ch.generatedAt.slice(0, 10))}
        </p>
      </div>
      <ChangeList entries={ch.entries} />
    </div>
  );
}
