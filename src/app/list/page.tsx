import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NormList } from '@/components/common/NormList';

export const metadata: Metadata = { title: '규범 일람' };

export default function ListPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">규범 전체 일람</h1>
        <p className="text-sm text-muted">법령·행정규칙·조약·자치법규·기관규정을 한 표로 봅니다.</p>
      </div>
      <Suspense>
        <NormList />
      </Suspense>
    </div>
  );
}
