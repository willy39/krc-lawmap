import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HierarchyTree } from '@/components/tree/HierarchyTree';

export const metadata: Metadata = { title: '체계트리' };

export default function TreePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">체계트리</h1>
        <p className="text-sm text-muted">헌법·조약 → 법률·시행령 → 행정규칙·자치법규 → 정관 → 규정 → 시행규칙 순 위계. 라벨(↗)은 원문, 행을 누르면 상세 패널.</p>
      </div>
      <Suspense>
        <HierarchyTree />
      </Suspense>
    </div>
  );
}
