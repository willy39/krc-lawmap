'use client';
// 헤더 팝업 버튼 — 사용안내(글)·사용안내(영상) (Esc·바깥 클릭으로 닫기, 포커스 이동·복귀, 배경 스크롤 잠금)
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { withBase } from '@/lib/links';
import { GuideContent } from './GuideContent';

function PopupButton(props: {
  icon: string;
  label: string;
  title: string;
  /** 팝업 머리의 '전체 화면으로 보기' 링크 */
  full: { href: string; external?: boolean };
  wide?: boolean;
  /** 본문 영역에 여백·스크롤을 주지 않는다(iframe 등) */
  bare?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = `popup-${props.icon}-${props.label}`;
  const close = () => setOpen(false);

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
      <button ref={btn} type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted hover:text-text" aria-haspopup="dialog">
        <span aria-hidden>{props.icon}</span>
        <span>{props.label}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-start justify-center bg-black/40 p-3 pt-[5vh] sm:p-6" onClick={close}>
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none ${props.wide ? 'max-w-6xl' : 'max-w-3xl'}`}
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <h2 id={`${id}-title`} className="text-lg font-bold">
                {props.title}
              </h2>
              {props.full.external ? (
                <a href={props.full.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline">
                  새 창으로 보기 ↗
                </a>
              ) : (
                <Link href={props.full.href} onClick={close} className="text-xs text-muted underline">
                  전체 화면으로 보기
                </Link>
              )}
              <button type="button" onClick={close} className="ml-auto rounded px-2 py-1 text-sm hover:bg-surface-2" aria-label={`${props.title} 닫기`}>
                닫기 ✕
              </button>
            </div>
            <div className={props.bare ? 'min-h-0 flex-1' : 'overflow-y-auto px-5 py-4'}>{props.children(close)}</div>
          </div>
        </div>
      )}
    </>
  );
}

export function GuideButton() {
  return (
    <PopupButton icon="❔" label="사용안내" title="사용안내" full={{ href: '/guide/' }}>
      {(close) => <GuideContent onNavigate={close} />}
    </PopupButton>
  );
}

/** 사용안내 영상 — Claude 채팅으로 만든 사용 안내 애니메이션(public/howto/index.html)을 팝업으로 */
export function HowtoButton() {
  const src = withBase('/howto/');
  return (
    <PopupButton icon="🎬" label="사용안내" title="법규 지도 사용 안내" full={{ href: src, external: true }} wide bare>
      {() => <iframe src={src} title="법규 지도 사용 안내 — 화면별 사용법 애니메이션" className="block h-[78vh] w-full border-0 bg-[#ecece8]" />}
    </PopupButton>
  );
}
