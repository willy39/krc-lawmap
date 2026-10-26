'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { Legend } from './Legend';
import { GuideButton } from './GuideDialog';

const TABS = [
  { href: '/', label: '체계도' },
  { href: '/tree/', label: '트리 목록' },
  { href: '/list/', label: '일람' },
  { href: '/local/', label: '조례' },
  { href: '/cases/', label: '판례·해석' },
  { href: '/changes/', label: '최근 변경' },
];

export function Header() {
  const { meta, setPaletteOpen } = useStore();
  const raw = usePathname() ?? '/';
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const path = raw.startsWith(base) ? raw.slice(base.length) || '/' : raw;
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href.replace(/\/$/, '')));

  return (
    <header className="sticky top-0 z-40 border-t-4 border-b border-t-law border-b-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-law">
          대한적십자사 법규 지도
          <span className="rounded border border-border px-1 text-[10px] font-semibold tracking-wider text-muted">BETA</span>
        </Link>
        <p className="tnum text-xs text-muted">
          기준일 {fmtDate(meta.baseDate)} · 규범 {meta.counts.norms.total} · 판례·해석 {meta.counts.cases.total}
        </p>
        <div className="ml-auto flex items-center gap-3">
          <GuideButton />
          <Legend />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-bg px-2.5 py-1 text-sm text-muted hover:text-text"
            aria-label="통합 검색 열기 (⌘K)"
          >
            <span aria-hidden>🔍</span>
            <span className="hidden sm:inline">검색</span>
            <kbd className="hidden rounded border border-border px-1 text-[10px] sm:inline">⌘K</kbd>
          </button>
        </div>
      </div>
      <nav aria-label="주요 화면" className="mx-auto max-w-[1440px] overflow-x-auto px-2">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active(t.href) ? 'page' : undefined}
                className={`block border-b-2 px-3 py-2 text-sm ${
                  active(t.href) ? 'border-text font-semibold' : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function DemoBanner() {
  const { meta } = useStore();
  if (meta.mode !== 'seed') return null;
  return (
    <div role="note" className="border-b border-dashed border-case/50 bg-case-bg px-4 py-2 text-center text-sm text-case">
      현재 <strong>데모 데이터</strong>로 화면을 보여주고 있습니다. ‘예시’ 표시 항목의 명칭·일자·사건번호는 실제가 아니며, 법제처 Open API 수집(<code>npm run data</code>) 후 실제 데이터로 바뀝니다.
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface px-4 py-8 text-sm text-muted">
      <div className="mx-auto max-w-[1440px] space-y-2">
        <p>
          본 서비스는 열람 편의를 위한 시범서비스이며 법적 효력은 국가법령정보센터 원문에 있습니다. 판례·해석은 담당자 검수 또는 자동분류로 선별한 일부이며 전부가 아닙니다.
        </p>
        <p>요지는 원문 일부를 발췌한 것이며, 판례 변경 여부 등은 원문에서 확인하세요.</p>
        <p>
          출처: 법제처 국가법령정보센터 (
          <a className="underline" href="https://www.law.go.kr" target="_blank" rel="noopener noreferrer">
            law.go.kr
          </a>
          ) · <Link href="/guide/" className="underline">사용안내</Link> · <Link href="/about/" className="underline">서비스 안내·검수 기준</Link>
        </p>
      </div>
    </footer>
  );
}
