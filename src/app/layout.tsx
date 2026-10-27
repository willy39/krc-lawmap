import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DataProvider } from '@/lib/store';
import { withBase } from '@/lib/links';
import { getAliases, getMeta, getNorms, getOrderRank, getRelations } from '@/lib/data';
import { DemoBanner, Footer, Header } from '@/components/common/Header';
import { DetailPanel } from '@/components/common/DetailPanel';
import { CommandPalette } from '@/components/common/CommandPalette';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: { default: '대한적십자사 법규 지도', template: '%s · 대한적십자사 법규 지도' },
  description: '국가법령정보센터에 흩어진 대한적십자사 관련 법령·조례·기관규정과 판례·해석을 한 화면에서 정리한 시범서비스',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 웹폰트는 서비스에 내장(public/fonts) — 내부망·폐쇄망에서도 외부 CDN 없이 동작 */}
        <link rel="stylesheet" href={withBase('/fonts/pretendard/pretendardvariable-dynamic-subset.css')} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-surface focus:p-2">
          본문 바로가기
        </a>
        <DataProvider norms={getNorms()} relations={getRelations()} meta={getMeta()} aliases={getAliases()} rank={getOrderRank()}>
          <Header />
          <DemoBanner />
          <main id="main" className="mx-auto max-w-[1440px] px-4 py-6">
            {children}
          </main>
          <Footer />
          <DetailPanel />
          <CommandPalette />
        </DataProvider>
        <Analytics />
      </body>
    </html>
  );
}
