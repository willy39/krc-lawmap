'use client';
// 사용안내 팝업 — 헤더 '사용안내' 버튼으로 연다 (Esc·바깥 클릭으로 닫기, 포커스 이동·복귀)
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GuideContent } from './GuideContent';

export function GuideButton() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      btn.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted hover:text-text"
        aria-haspopup="dialog"
      >
        <span aria-hidden>❔</span>
        <span>사용안내</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-start justify-center bg-black/40 p-3 pt-[6vh] sm:p-6" onClick={() => setOpen(false)}>
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none"
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <h2 id="guide-title" className="text-lg font-bold">
                사용안내
              </h2>
              <Link href="/guide/" onClick={() => setOpen(false)} className="text-xs text-muted underline">
                전체 화면으로 보기
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded px-2 py-1 text-sm hover:bg-surface-2" aria-label="사용안내 닫기">
                닫기 ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <GuideContent onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
