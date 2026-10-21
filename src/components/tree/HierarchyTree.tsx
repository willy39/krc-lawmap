'use client';
// 체계트리 (설계서 7.3) — WAI-ARIA tree 패턴, 키보드 ↑↓←→ / Enter 상세 / o 원문
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ancestorsOf, buildTree, type TreeNode } from '@/lib/tree';
import { fmtDate } from '@/lib/format';
import { CaseBadge, KindChip, StatusBadges } from '@/components/common/Chips';

interface Flat {
  node: TreeNode;
  depth: number;
  parent: string | null;
}

export function HierarchyTree({ compact = false }: { compact?: boolean }) {
  const { norms, openDetail, rank } = useStore();
  const tree = useMemo(() => buildTree(norms, rank), [norms, rank]);
  const params = useSearchParams();
  const router = useRouter();
  const focusId = params?.get('focus') ?? null;

  const [open, setOpen] = useState<Set<string>>(() => {
    // 기본: 체계트리는 규정–시행규칙까지 모두 펼침, 모바일 홈(compact)은 2단계까지
    const s = new Set<string>();
    const depth = compact ? 2 : Infinity;
    const walk = (ns: TreeNode[], d: number) => ns.forEach((n) => d < depth && (s.add(n.key), walk(n.children, d + 1)));
    walk(tree, 0);
    return s;
  });
  const [active, setActive] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!focusId) return;
    const anc = ancestorsOf(tree, focusId);
    if (!anc) return;
    setOpen((o) => new Set([...o, ...anc]));
    setActive(focusId);
    setTimeout(() => refs.current.get(focusId)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  }, [focusId, tree]);

  const flat = useMemo(() => {
    const out: Flat[] = [];
    const walk = (ns: TreeNode[], depth: number, parent: string | null) => {
      for (const n of ns) {
        out.push({ node: n, depth, parent });
        if (open.has(n.key)) walk(n.children, depth + 1, n.key);
      }
    };
    walk(tree, 0, null);
    return out;
  }, [tree, open]);

  const current = active ?? flat[0]?.node.key;
  const toggle = (key: string, v?: boolean) =>
    setOpen((o) => {
      const s = new Set(o);
      if (v ?? !s.has(key)) s.add(key);
      else s.delete(key);
      return s;
    });
  const focus = (key: string) => {
    setActive(key);
    refs.current.get(key)?.focus();
  };
  const activate = (n: TreeNode) => {
    if (n.norm) openDetail(n.norm.id);
    else if (n.href) router.push(n.href);
    else toggle(n.key);
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const f = flat[i];
    const n = f.node;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (flat[i + 1]) focus(flat[i + 1].node.key);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (flat[i - 1]) focus(flat[i - 1].node.key);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (n.children.length && !open.has(n.key)) toggle(n.key, true);
        else if (n.children.length) focus(n.children[0].key);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (open.has(n.key) && n.children.length) toggle(n.key, false);
        else if (f.parent) focus(f.parent);
        break;
      case 'Home':
        e.preventDefault();
        focus(flat[0].node.key);
        break;
      case 'End':
        e.preventDefault();
        focus(flat[flat.length - 1].node.key);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        activate(n);
        break;
      case 'o':
        if (n.norm) window.open(n.norm.url, '_blank', 'noopener');
        break;
    }
  };

  const expandAll = () => {
    const s = new Set<string>();
    const walk = (ns: TreeNode[]) => ns.forEach((n) => (s.add(n.key), walk(n.children)));
    walk(tree);
    setOpen(s);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-md border border-border px-3 py-1 hover:bg-surface-2" onClick={expandAll}>
            모두 펼치기
          </button>
          <button type="button" className="rounded-md border border-border px-3 py-1 hover:bg-surface-2" onClick={() => setOpen(new Set(tree.map((t) => t.key)))}>
            모두 접기
          </button>
          <span className="self-center text-xs text-muted">키보드: ↑↓ 이동 · →← 펼침/접기 · Enter 상세 · o 원문</span>
        </div>
      )}
      <div role="tree" aria-label="대한적십자사 법규 체계" className="rounded-lg border border-border bg-surface py-1">
        {flat.map((f, i) => {
          const n = f.node;
          const expanded = n.children.length ? open.has(n.key) : undefined;
          const isActive = n.key === current;
          return (
            <div
              key={n.key}
              ref={(el) => {
                if (el) refs.current.set(n.key, el);
                else refs.current.delete(n.key);
              }}
              role="treeitem"
              aria-level={f.depth + 1}
              aria-expanded={expanded}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, i)}
              onFocus={() => setActive(n.key)}
              onClick={() => activate(n)}
              className={`flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 py-1.5 pr-3 text-sm hover:bg-surface-2 ${
                focusId === n.key ? 'bg-case-bg' : ''
              }`}
              style={{ paddingLeft: `${0.5 + f.depth * 1.1}rem` }}
            >
              <span
                aria-hidden
                className="w-4 shrink-0 text-center text-muted"
                onClick={(e) => {
                  if (!n.children.length) return;
                  e.stopPropagation();
                  toggle(n.key);
                }}
              >
                {n.children.length ? (expanded ? '▾' : '▸') : '·'}
              </span>
              {n.kind === 'norm' && n.norm ? (
                <>
                  <a
                    href={n.norm.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    className={`ext hover:underline ${n.norm.isCore ? 'font-semibold' : ''}`}
                  >
                    {n.label}
                  </a>
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    <KindChip norm={n.norm} />
                    {n.norm.effectiveAt && <span className="tnum hidden text-xs text-muted sm:inline">시행 {fmtDate(n.norm.effectiveAt)}</span>}
                    <StatusBadges norm={n.norm} />
                    <CaseBadge norm={n.norm} />
                  </span>
                </>
              ) : n.kind === 'ordin' ? (
                <Link href={n.href!} onClick={(e) => e.stopPropagation()} tabIndex={-1} className="text-local hover:underline">
                  🗺 {n.label} <span className="tnum">({n.count}건)</span> → 조례 지역뷰
                </Link>
              ) : (
                <span className="font-medium text-muted">
                  [{n.label}] <span className="tnum">{n.count}건</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
