'use client';
// 방문 집계 — 공개 배포(GitHub Pages·Vercel)에서만 GoatCounter 로 페이지 조회를 보낸다.
// NEXT_PUBLIC_GOATCOUNTER(사이트 코드)가 빌드에 없으면 아무것도 하지 않는다(내부 서버·Docker 빌드).
// 쿠키·로컬 저장소를 쓰지 않고, 이미지 비콘 하나만 보낸다. 절차: docs/analytics.md
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const CODE = process.env.NEXT_PUBLIC_GOATCOUNTER ?? '';
const VALID = /^[a-z0-9][a-z0-9-]{1,48}$/.test(CODE);

export function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (!VALID || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    // 화면 제목이 바뀐 뒤 보낸다(클라이언트 전환 직후에는 이전 제목이 남아 있을 수 있음)
    const t = setTimeout(() => {
      const q = new URLSearchParams({
        p: pathname + (search ? `?${search}` : ''),
        t: document.title,
        r: document.referrer,
        s: String(screen.width),
        rnd: Math.random().toString(36).slice(2),
      });
      new Image().src = `https://${CODE}.goatcounter.com/count?${q}`;
    }, 300);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return null;
}
