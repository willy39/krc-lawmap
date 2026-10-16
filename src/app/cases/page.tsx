import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCases, getMeta } from '@/lib/data';
import { CaseLibrary } from '@/components/cases/CaseLibrary';

export const metadata: Metadata = { title: '판례·해석 라이브러리' };

export default function CasesPage() {
  const auto = getMeta().relevance?.auto ?? 70;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">판례·해석 라이브러리</h1>
        <p className="text-sm text-muted">
          판례·헌재결정례·법령해석례·중앙부처 1차 해석·결정선례·행정심판례 중 담당자 검수(승인) 또는 자동분류(관련도 {auto}점 이상)된 자료입니다.
        </p>
      </div>
      <Suspense>
        <CaseLibrary cases={getCases()} />
      </Suspense>
    </div>
  );
}
