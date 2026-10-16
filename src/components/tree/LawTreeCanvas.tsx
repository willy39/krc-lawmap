'use client';
// 법규 나무 조감도 (설계서 7.2) — 레이아웃은 d3-hierarchy, 렌더는 React SVG
// 뿌리(헌법·제네바협약) → 줄기(조직법) → 큰가지(관련 법률·정관) → 열매(분야별 규정 묶음), 자치법규는 곁가지 노드 1개로 접어 둔다.
import { hierarchy, tree as d3tree } from 'd3-hierarchy';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { buildTree, type TreeNode } from '@/lib/tree';
import { withBase } from '@/lib/links';

const VISUAL_LEVELS = new Set(['L1_ACT', 'L2_DECREE', 'L1R_RELATED', 'L3_ARTICLES']);

interface VNode {
  key: string;
  label: string;
  type: 'root' | 'law' | 'articles' | 'fruit' | 'ordin';
  node?: TreeNode;
  children: VNode[];
}

function toVisual(n: TreeNode): VNode | null {
  if (n.kind === 'field') return { key: n.key, label: `${n.label} ${n.count}`, type: 'fruit', node: n, children: [] };
  if (n.kind === 'ordin') return { key: n.key, label: `🗺 ${n.label.replace('자치법규 — ', '')} ${n.count}건`, type: 'ordin', node: n, children: [] };
  if (!n.norm || !VISUAL_LEVELS.has(n.norm.level)) return null;
  // 시행규칙 등 하위 법령은 나무에서 생략(체계트리에서 확인)
  const kids = n.children.map(toVisual).filter((x): x is VNode => !!x).filter((k) => !(n.norm!.level === 'L1R_RELATED' && k.type === 'law'));
  return { key: n.key, label: n.label, type: n.norm.level === 'L3_ARTICLES' ? 'articles' : 'law', node: n, children: kids };
}

/** 공백·가운뎃점 기준 줄바꿈 (SVG text 는 자동 줄바꿈이 없다) */
function wrap(label: string, max: number): string[] {
  const words = label.split(/(?<=[\s·])/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + w).trim().length > max && cur) {
      lines.push(cur.trim());
      cur = w;
    } else cur += w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 3);
}

export function LawTreeCanvas() {
  const { norms, openDetail, normById } = useStore();
  const router = useRouter();
  const roots = useMemo(() => buildTree(norms), [norms]);
  const constitution = roots.find((r) => r.norm?.level === 'L0_CONSTITUTION');
  const treaty = roots.find((r) => r.norm?.level === 'L0_TREATY');

  const layout = useMemo(() => {
    const top: VNode = {
      key: '#root',
      label: '',
      type: 'root',
      children: (constitution?.children ?? []).map(toVisual).filter((x): x is VNode => !!x),
    };
    // 근거 법률(조직법)을 가운데 줄기로
    top.children.sort((a, b) => {
      const w = (v: VNode) => (v.node?.norm?.level === 'L1_ACT' ? 0 : 1);
      return w(a) - w(b);
    });
    const mid = top.children.shift();
    if (mid) top.children.splice(Math.floor(top.children.length / 2), 0, mid);

    const h = hierarchy(top);
    // 열매(분야 묶음)는 촘촘히, 법령 상자는 넓게
    const unit = (v: VNode) => (v.type === 'fruit' ? 0.9 : v.type === 'ordin' ? 1.3 : 1.6);
    const t = d3tree<VNode>()
      .nodeSize([100, 105])
      .separation((a, b) => (unit(a.data) + unit(b.data)) / 2 + (a.parent === b.parent ? 0 : 0.3));
    const r = t(h);
    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = 0;
    r.each((d) => {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      maxY = Math.max(maxY, d.y);
    });
    return { r, minX, maxX, maxY };
  }, [constitution]);

  const { r, minX, maxX, maxY } = layout;
  const pad = 80;
  const width = Math.max(720, maxX - minX + pad * 2);
  const height = maxY + 170;
  const X = (x: number) => x - minX + pad + (width - (maxX - minX + pad * 2)) / 2;
  const Y = (y: number) => height - 70 - y; // 뿌리가 아래

  const go = (v: VNode) => {
    if (v.type === 'fruit') router.push(`/tree/?focus=${encodeURIComponent(v.key)}`);
    else if (v.type === 'ordin') router.push(v.node?.href ?? '/local/');
    else if (v.node?.norm) openDetail(v.node.norm.id);
  };
  const keyAct = (v: VNode) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go(v);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[720px]" role="group" aria-label="법규 나무 조감도 (텍스트 대안: 체계트리)">
        <title>대한적십자사 법규 나무</title>
        {/* 가지 */}
        {r.links().map((l) => {
          const sx = X(l.source.x);
          const sy = Y(l.source.y);
          const tx = X(l.target.x);
          const ty = Y(l.target.y);
          const trunk = l.source.data.type === 'root';
          const side = l.target.data.type === 'ordin';
          return (
            <path
              key={`${l.source.data.key}-${l.target.data.key}`}
              d={`M${sx},${sy} C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`}
              fill="none"
              stroke={side ? 'var(--local)' : 'var(--tree-trunk)'}
              strokeWidth={trunk ? 9 : side ? 2 : 5}
              strokeDasharray={side ? '5 4' : undefined}
              strokeLinecap="round"
              opacity={side ? 0.8 : 0.75}
            />
          );
        })}
        {/* 노드 */}
        {r.descendants().map((d) => {
          const v = d.data;
          if (v.type === 'root') return null;
          const x = X(d.x);
          const y = Y(d.y);
          const norm = v.node?.norm;
          const count = norm ? normById.get(norm.id)?.caseCount ?? 0 : 0;
          if (v.type === 'fruit') {
            return (
              <g key={v.key} transform={`translate(${x},${y})`} role="link" tabIndex={0} aria-label={`${v.label}건 규정 묶음`} onClick={() => go(v)} onKeyDown={keyAct(v)} className="cursor-pointer">
                <circle r={24} fill="var(--inst-bg)" stroke="var(--inst)" strokeWidth={2} />
                <text textAnchor="middle" y={5} fontSize={14} fontWeight={700} fill="var(--inst)" className="tnum">
                  {v.node?.count}
                </text>
                <text textAnchor="middle" fontSize={11.5} fill="var(--text)">
                  {wrap(v.node?.label ?? '', 6).map((ln, i, arr) => (
                    <tspan key={i} x={0} y={-30 - (arr.length - 1 - i) * 13}>
                      {ln}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          }
          if (v.type === 'ordin') {
            return (
              <g key={v.key} transform={`translate(${x},${y})`} role="link" tabIndex={0} aria-label={`${v.label} — 조례 지역뷰`} onClick={() => go(v)} onKeyDown={keyAct(v)} className="cursor-pointer">
                <rect x={-68} y={-16} width={136} height={32} rx={16} fill="var(--local-bg)" stroke="var(--local)" strokeDasharray="4 3" />
                <text textAnchor="middle" y={5} fontSize={12} fill="var(--local)">
                  {v.label}
                </text>
              </g>
            );
          }
          const display = v.label.replace(/^대한적십자사 (?=조직법 )/, '');
          const lines = wrap(display, 9);
          const w = Math.min(150, Math.max(84, Math.max(...lines.map((l) => l.length)) * 12.5 + 28));
          const h = 14 + lines.length * 15;
          return (
            <g key={v.key} transform={`translate(${x},${y})`}>
              <g role="button" tabIndex={0} aria-label={`${v.label} 상세 보기`} onClick={() => go(v)} onKeyDown={keyAct(v)} className="cursor-pointer">
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={8}
                  fill={v.type === 'articles' ? 'var(--inst-bg)' : 'var(--law-bg)'}
                  stroke={v.type === 'articles' ? 'var(--inst)' : 'var(--law)'}
                  strokeWidth={norm?.isCore ? 2 : 1}
                />
              </g>
              <a href={norm?.url} target="_blank" rel="noopener noreferrer" aria-label={`${v.label} 원문 (새 탭)`}>
                <text textAnchor="middle" fontSize={12.5} fontWeight={norm?.isCore ? 700 : 500} fill={v.type === 'articles' ? 'var(--inst)' : 'var(--law)'} className="hover:underline">
                  {lines.map((ln, i) => (
                    <tspan key={i} x={0} y={-h / 2 + 19 + i * 15}>
                      {ln}
                      {i === lines.length - 1 ? ' ↗' : ''}
                    </tspan>
                  ))}
                </text>
              </a>
              {count > 0 && (
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`관련 판례·해석 ${count}건`}
                  transform={`translate(${w / 2 - 4},${-h / 2})`}
                  onClick={() => norm && openDetail(norm.id, { tab: 'cases' })}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && norm && openDetail(norm.id, { tab: 'cases' })}
                  className="cursor-pointer"
                >
                  <rect x={-8} y={-11} width={40} height={22} rx={11} fill="var(--case-bg)" stroke="var(--case)" />
                  <text x={12} y={5} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--case)" className="tnum">
                    ⚖ {count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* 뿌리 */}
        <g transform={`translate(0,${height - 46})`}>
          <rect x={pad / 2} y={0} width={width - pad} height={34} rx={6} fill="var(--surface-2)" stroke="var(--tree-trunk)" />
          <text x={width / 2} y={22} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--text)">
            {constitution?.norm && (
              <a href={constitution.norm.url} target="_blank" rel="noopener noreferrer">
                <tspan className="hover:underline">{constitution.norm.title} ↗</tspan>
              </a>
            )}
            {treaty?.norm && (
              <>
                <tspan dx={6}> · </tspan>
                <a href={treaty.norm.url} target="_blank" rel="noopener noreferrer">
                  <tspan className="hover:underline">{treaty.norm.title} ↗</tspan>
                </a>
              </>
            )}
          </text>
        </g>
      </svg>
      <p className="border-t border-border px-4 py-2 text-xs text-muted">
        라벨(↗) = 원문 새 탭 · 상자 = 상세 패널 · 열매 = 분야별 기관규정 묶음 · 점선 = 자치법규 곁가지 ·{' '}
        <a className="underline" href={withBase('/tree/')}>
          텍스트로 보기(체계트리)
        </a>
      </p>
    </div>
  );
}
