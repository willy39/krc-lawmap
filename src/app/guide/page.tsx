import type { Metadata } from 'next';
import { GuideContent } from '@/components/common/GuideContent';

export const metadata: Metadata = { title: '사용안내', description: '검색창 사용법, 화면 구성, 법규 나무·판례·해석 보는 법' };

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">사용안내</h1>
      <GuideContent />
    </article>
  );
}
