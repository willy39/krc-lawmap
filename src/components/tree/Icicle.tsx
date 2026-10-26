'use client';
// B2 아이시클 — 헌법 띠가 아래로 내려가며 쪼개지고, 칸 폭이 딸린 규범 수를 나타낸다.
// 칸을 고르면 아래에 그 칸(분야)의 규정 목록이 열린다. 선택은 URL(?cell=)에 남아 공유할 수 있다.
import Link from 'next/link';
import { useMemo } from 'react';
import type { NormItem } from '@/types/model';
import { useStore } from '@/lib/store';
import { useQueryState } from '@/lib/url-state';
import { buildIcicle, findCell, pathTo, type Cell, type CellKind } from '@/lib/icicle';
import { fmtDate } from '@/lib/format';
import { BUNDLE_NAMES } from '@/lib/labels';
import { CaseBadge, KindChip, StatusBadges } from '@/components/common/Chips';

const ROW_H = [60, 92, 92, 132];

const STYLE: Record<CellKind, { base: string; on: string }> = {
  root: { base: 'bg-law text-bg', on: 'bg-law text-bg ring-4 ring-law/30' },
  law: { base: 'bg-law-bg text-law border border-law/25', on: 'bg-law text-bg' },
  decree: { base: 'bg-surface text-law border border-law/25', on: 'bg-law text-bg' },
  articles: { base: 'bg-inst text-bg', on: 'bg-inst text-bg ring-4 ring-inst/30' },
  field: { base: 'bg-inst-bg text-inst border border-inst/25', on: 'bg-inst text-bg' },
  admrul: { base: 'bg-surface-2 text-law border border-border', on: 'bg-law text-bg' },
  ordin: { base: 'bg-local-bg text-local border border-dashed border-local/50', on: 'bg-local text-bg' },
  treaties: { base: 'bg-trty text-bg', on: 'bg-trty text-bg ring-4 ring-trty/30' },
  treatyGroup: { base: 'bg-trty-bg text-trty border border-trty/25', on: 'bg-trty text-bg' },
  orphan: { base: 'bg-surface-2 text-muted border border-border', on: 'bg-text text-bg' },
};

const MIN_W = [90, 58, 46, 50];
const GAP = 3;
/** 칸의 최소 폭 = max(깊이별 최소, 자식 최소 폭 합 + 간격) — 자식이 부모 밖으로 넘치지 않게 */
function minWidth(cell: Cell, depth: number): number {
  const own = MIN_W[depth] ?? 60;
  if (!cell.children.length) return own;
  const kids = cell.children.reduce((s, c) => s + minWidth(c, depth + 1), 0) + GAP * (cell.children.length - 1);
  return Math.max(own, kids);
}

function Column({ cell, depth, selected, path, onSelect, parentTitle }: { cell: Cell; depth: number; selected: string; path: Set<string>; onSelect: (k: string) => void; parentTitle?: string }) {
  const isSel = cell.key === selected;
  const inPath = path.has(cell.key);
  const leaf = cell.children.length === 0;
  const st = STYLE[cell.kind];
  const count = cell.items.filter((i) => i.source !== 'ordin').length;
  const ordCount = cell.items.length - count;
  // 칸 라벨: 상위 법령명과 겹치는 앞부분은 생략(혈액관리법 › 시행령), 약칭이 있으면 약칭, '대한적십자사 ' 접두어 생략
  const full = cell.norm?.title ?? cell.label;
  const label = (() => {
    if (!cell.norm || depth === 0) return full;
    if (parentTitle && full.startsWith(`${parentTitle} `)) return full.slice(parentTitle.length + 1);
    const useShort = cell.norm.level !== 'L1_ACT';
    return ((useShort && cell.norm.shortTitle) || full).replace(/^대한적십자사\s+(?!조직법$)/, '');
  })();
  return (
    <div className="flex min-w-0 flex-col gap-[3px]" style={{ flex: `${cell.weight} 1 0`, minWidth: minWidth(cell, depth) }}>
      <button
        type="button"
        onClick={() => onSelect(cell.key)}
        aria-pressed={isSel}
        title={`${full} — ${cell.kind === 'ordin' ? `조례 ${cell.items.length}건` : `규범 ${count}건${ordCount ? ` · 조례 ${ordCount}건` : ''}`}`}
        className={`@container group relative flex w-full flex-col items-start justify-between overflow-hidden rounded-lg px-1.5 py-2 text-left transition ${isSel ? st.on : st.base} ${
          ''
        } ${inPath && !isSel ? 'outline-2 outline-offset-[-2px] outline-current' : ''} hover:brightness-[0.97] ${leaf ? 'flex-1' : ''}`}
        style={{ minHeight: ROW_H[depth] ?? 92 }}
      >
        <span
          className={`font-semibold leading-snug ${depth === 0 ? 'text-base' : 'text-[13px]'} max-h-[7.5em] overflow-hidden [writing-mode:vertical-rl] @[30px]:max-h-none @[30px]:[writing-mode:horizontal-tb] @[30px]:line-clamp-4 @[30px]:break-all @[80px]:line-clamp-3 @[80px]:break-normal`}
        >
          {label}
        </span>
        <span className="tnum mt-1 flex w-full flex-wrap items-center gap-x-1.5 text-xs opacity-90">
          {cell.kind === 'ordin' ? `🗺 ${cell.items.length}건` : `${count}건`}
          {ordCount > 0 && cell.kind !== 'ordin' && depth < 2 && <span className="hidden opacity-80 @[120px]:inline">+ 조례 {ordCount}</span>}
          {!!cell.norm?.caseCount && <span className="hidden rounded-full bg-black/10 px-1.5 font-bold @[60px]:ml-auto @[60px]:inline">⚖ {cell.norm.caseCount}</span>}
        </span>
      </button>
      {!leaf && (
        <div className="flex flex-1 gap-[3px]">
          {cell.children.map((c) => (
            <Column key={c.key} cell={c} depth={depth + 1} selected={selected} path={path} onSelect={onSelect} parentTitle={cell.norm?.title} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 선택 칸 목록: 상위–하위(운영규정 → 시행규칙) 들여쓰기, 법규집 순서 */
function NormRows({ items, rootIds }: { items: NormItem[]; rootIds?: Set<string> }) {
  const { openDetail, rank } = useStore();
  const ids = new Set(items.map((i) => i.id));
  const r = (n: NormItem) => rank[n.title.replace(/\s/g, '')] ?? 9999;
  const sort = (a: NormItem, b: NormItem) => a.level.localeCompare(b.level) || r(a) - r(b) || a.title.localeCompare(b.title, 'ko');
  const tops = items.filter((i) => (rootIds ? rootIds.has(i.id) : !i.parentId || !ids.has(i.parentId))).sort(sort);
  const kids = (id: string) => items.filter((i) => i.parentId === id).sort(sort);
  const row = (n: NormItem, lvl: number): React.ReactNode => (
    <li key={n.id} className="break-inside-avoid">
      <div className="flex items-start gap-2 border-b border-border/60 py-1.5 text-sm" style={{ paddingLeft: `${lvl * 1.25}rem` }}>
        {lvl > 0 && <span className="pt-0.5 text-muted" aria-hidden>└</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <KindChip norm={n} />
            <button type="button" onClick={() => openDetail(n.id)} className="text-left font-medium hover:underline">
              {n.shortTitle ?? n.title}
            </button>
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-text" aria-label={`${n.title} 원문 (새 탭)`}>
              원문↗
            </a>
            <StatusBadges norm={{ ...n, flags: n.flags.filter((f) => f !== 'NO_PARENT') }} />
            <CaseBadge norm={n} />
          </div>
          <p className="tnum text-xs text-muted">
            {n.agency && n.source !== 'pi' ? `${n.agency} · ` : ''}시행 {fmtDate(n.effectiveAt)}
          </p>
        </div>
      </div>
      {kids(n.id).length > 0 && <ul>{kids(n.id).map((k) => row(k, lvl + 1))}</ul>}
    </li>
  );
  return <ul className="columns-1 gap-10 lg:columns-2 [column-rule:1px_solid_var(--border)]">{tops.map((t) => row(t, 0))}</ul>;
}

function OrdinanceRows({ items }: { items: NormItem[] }) {
  const { openDetail } = useStore();
  const bySido = new Map<string, NormItem[]>();
  for (const o of items) {
    const k = o.region?.sido ?? '지역 미상';
    if (!bySido.has(k)) bySido.set(k, []);
    bySido.get(k)!.push(o);
  }
  return (
    <div className="columns-1 gap-8 md:columns-2 xl:columns-3">
      {[...bySido.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([sido, list]) => (
          <section key={sido} className="mb-4 break-inside-avoid">
            <h4 className="mb-1 flex justify-between border-b border-local/40 text-sm font-bold text-local">
              {sido} <span className="tnum font-normal">{list.length}건</span>
            </h4>
            <ul className="space-y-0.5 text-sm">
              {list.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => openDetail(o.id)} className="text-left hover:underline">
                    {o.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

export function Icicle() {
  const { norms, rank, openDetail } = useStore();
  const { get, set } = useQueryState();
  const proportional = get('ord') === '1';
  const root = useMemo(() => buildIcicle(norms, rank, { ordinancesProportional: proportional }), [norms, rank, proportional]);
  const fallback = findCell(root, (c) => c.kind === 'articles')?.key ?? root.children[0]?.key ?? '#all';
  const selectedKey = get('cell') && findCell(root, (c) => c.key === get('cell')) ? get('cell') : fallback;
  const path = pathTo(root, selectedKey) ?? [root];
  const cell = path[path.length - 1];
  const pathKeys = new Set(path.map((p) => p.key));
  const select = (k: string) => set({ cell: k === fallback ? null : k });
  // '상위 근거 미지정'은 그림 대신 아래 링크로 (그림 폭을 아끼기 위해)
  const cols = root.children.filter((c) => c.kind !== 'orphan');
  const orphan = root.children.find((c) => c.kind === 'orphan');

  const big = cell.items.length > 80 && cell.children.length > 0;
  const nonOrd = cell.items.filter((i) => i.source !== 'ordin');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm md:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold">법규 체계도</h2>
          <p className="text-xs text-muted">위에서 아래로 상위 → 하위 · 칸 폭 = 딸린 규범 수 · 칸을 누르면 아래에 목록</p>
          <div role="group" aria-label="칸 폭 기준" className="ml-auto flex overflow-hidden rounded-md border border-border text-xs">
            <button type="button" aria-pressed={!proportional} onClick={() => set({ ord: null })} className={`px-2.5 py-1 ${!proportional ? 'bg-text text-bg' : 'hover:bg-surface-2'}`}>
              기관규정 중심
            </button>
            <button type="button" aria-pressed={proportional} onClick={() => set({ ord: '1' })} className={`px-2.5 py-1 ${proportional ? 'bg-text text-bg' : 'hover:bg-surface-2'}`}>
              조례 포함 실제 비율
            </button>
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-[3px]" style={{ minWidth: cols.reduce((s, c) => s + minWidth(c, 0), 0) + GAP * (cols.length - 1) }}>
            {cols.map((c) => (
              <Column key={c.key} cell={c} depth={0} selected={selectedKey} path={pathKeys} onSelect={select} />
            ))}
          </div>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-law align-middle" />
            법령
          </span>
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-inst align-middle" />
            정관·기관규정
          </span>
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-local bg-local-bg align-middle" />
            자치법규(조례)
          </span>
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-trty align-middle" />
            조약
          </span>
          {!proportional && <span>※ ‘기관규정 중심’에서는 조례 칸을 좁게 고정해 보여 줍니다</span>}
          {orphan && (
            <button type="button" onClick={() => select(orphan.key)} className="ml-auto underline hover:text-text">
              상위 근거 미지정 {orphan.items.length}건 보기
            </button>
          )}
        </p>
      </div>

      <section aria-live="polite" aria-labelledby="cell-h" className="rounded-2xl border border-border bg-surface p-4 md:p-6">
        <nav aria-label="선택 경로" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted">
          {path.slice(1).map((p, i, arr) => (
            <span key={p.key} className="flex items-center gap-1">
              <button type="button" onClick={() => select(p.key)} className="hover:text-text hover:underline">
                {p.norm ? (p.norm.source === 'pi' ? (p.norm.shortTitle ?? p.norm.title) : p.norm.title) : p.label}
              </button>
              {i < arr.length - 1 && <span aria-hidden>›</span>}
            </span>
          ))}
        </nav>
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
          <h3 id="cell-h" className="text-xl font-bold">
            {cell.norm?.title ?? cell.label}
          </h3>
          <span className="tnum text-sm text-muted">
            {cell.kind === 'ordin' ? `조례 ${cell.items.length}건` : `규범 ${nonOrd.length}건`}
            {cell.kind !== 'ordin' && cell.items.length > nonOrd.length && ` · 조례 ${cell.items.length - nonOrd.length}건`}
          </span>
          {cell.norm && (
            <span className="flex items-center gap-2 text-sm">
              <button type="button" onClick={() => openDetail(cell.norm!.id)} className="rounded-md border border-border px-2.5 py-0.5 hover:bg-surface-2">
                상세
              </button>
              <a href={cell.norm.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-2.5 py-0.5 hover:bg-surface-2">
                원문 ↗
              </a>
              <CaseBadge norm={cell.norm} />
            </span>
          )}
          {cell.kind === 'ordin' && (
            <Link href={`/local/?bundle=${cell.key.split('#ordin-')[1]}`} className="text-sm underline">
              {BUNDLE_NAMES[cell.key.split('#ordin-')[1] as keyof typeof BUNDLE_NAMES]} 조례 지역뷰 →
            </Link>
          )}
        </div>

        {cell.kind === 'ordin' ? (
          <OrdinanceRows items={cell.items} />
        ) : big ? (
          <div className="space-y-4">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cell.children.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => select(c.key)} className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left hover:border-text">
                    <span className="font-medium">{c.norm?.title ?? c.label}</span>
                    <span className="tnum text-sm text-muted">{c.kind === 'ordin' ? `조례 ${c.items.length}` : `${c.items.filter((i) => i.source !== 'ordin').length}건`} ›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <NormRows items={cell.norm ? nonOrd.filter((i) => i.id !== cell.norm!.id) : nonOrd} />
        )}
      </section>
    </div>
  );
}
