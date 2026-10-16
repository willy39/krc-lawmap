'use client';
// 필터 상태 ↔ URL 쿼리 동기화
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useQueryState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = useCallback((k: string) => params?.get(k) ?? '', [params]);
  const set = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const p = new URLSearchParams(params?.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      const qs = p.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [params, router, pathname],
  );
  return { get, set };
}
