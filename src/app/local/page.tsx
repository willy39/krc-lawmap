import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getRegions } from '@/lib/data';
import { LocalView } from '@/components/local/LocalView';

export const metadata: Metadata = { title: '자치법규 지역뷰' };

export default function LocalPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">자치법규 지역뷰</h1>
        <p className="text-sm text-muted">17개 시·도와 시·군·구의 적십자 지원·헌혈 장려 등 관련 조례. 타일을 누르면 해당 지역 목록을 봅니다.</p>
      </div>
      <Suspense>
        <LocalView regions={getRegions()} />
      </Suspense>
    </div>
  );
}
