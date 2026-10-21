'use client';
// 법규 나무 조감도 (설계서 7.2) — 레이아웃은 d3-hierarchy, 렌더는 React SVG
// 땅속 뿌리(헌법·조약) → 줄기(조직법) → 큰가지(관련 법률·정관) → 잎 무리 속 열매(분야별 기관규정 묶음),
// 자치법규는 점선 곁가지 노드 1개로 접어 둔다. 가지 굵기는 그 가지가 품은 규범 수에 비례한다.
import { hierarchy, tree as d3tree, type HierarchyPointNode } from 'd3-hierarchy';
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
  weight: number; // 이 가지 아래 규범 수 (굵기)
  children: VNode[];
}

function countNorms(n: TreeNode): number {
  return (n.norm ? 1 : 0) + (n.kind === 'ordin' ? (n.count ?? 0) : 0) + n.children.reduce((s, c) => s + countNorms(c), 0);
}

function toVisual(n: TreeNode): VNode | null {
  if (n.kind === 'field') return { key: n.key, label: n.label, type: 'fruit', node: n, weight: countNorms(n), children: [] };
  if (n.kind === 'ordin') return { key: n.key, label: n.label.replace('자치법규 — ', ''), type: 'ordin', node: n, weight: n.count ?? 0, children: [] };
  if (!n.norm || !VISUAL_LEVELS.has(n.norm.level)) return null;
  // 관련 법률의 시행령·시행규칙, 행정규칙은 나무에서 생략(체계트리에서 확인)
  const kids = n.children
    .map(toVisual)
    .filter((x): x is VNode => !!x)
    .filter((k) => !(n.norm!.level === 'L1R_RELATED' && k.type === 'law'));
  return { key: n.key, label: n.label, type: n.norm.level === 'L3_ARTICLES' ? 'articles' : 'law', node: n, weight: countNorms(n), children: kids };
}

/** 공백·가운뎃점 기준 줄바꿈 (SVG text 는 자동 줄바꿈이 없다) */
function wrap(label: string, max: number, maxLines = 3): string[] {
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
  if (lines.length > maxLines) return [...lines.slice(0, maxLines - 1), `${lines.slice(maxLines - 1).join(' ').slice(0, max - 1)}…`];
  return lines;
}

// 결정적 의사난수 (잎 무리 배치가 빌드마다 같도록)
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
}

const HALO = { paintOrder: 'stroke' as const, stroke: 'var(--plaque)', strokeWidth: 4, strokeLinejoin: 'round' as const };

export function LawTreeCanvas() {
  const { norms, openDetail, normById, rank } = useStore();
  const router = useRouter();
  const roots = useMemo(() => buildTree(norms, rank), [norms, rank]);
  const constitution = roots.find((r) => r.norm?.level === 'L0_CONSTITUTION');
  const treatyGroup = roots.find((r) => r.key === '#treaties');

  const layout = useMemo(() => {
    const kids = (constitution?.children ?? []).map(toVisual).filter((x): x is VNode => !!x);
    // 근거 법률(조직법)을 가운데 줄기로, 나머지는 무게 순으로 좌우 교대 배치
    const main = kids.find((k) => k.node?.norm?.level === 'L1_ACT');
    const others = kids.filter((k) => k !== main).sort((a, b) => b.weight - a.weight);
    const left: VNode[] = [];
    const right: VNode[] = [];
    others.forEach((o, i) => (i % 2 ? left : right).push(o));
    const ordered = [...left.reverse(), ...(main ? [main] : []), ...right];
    const top: VNode = { key: '#root', label: '', type: 'root', weight: ordered.reduce((s, k) => s + k.weight, 0), children: ordered };

    const h = hierarchy(top);
    const unit = (v: VNode) => (v.type === 'fruit' ? 1.12 : v.type === 'ordin' ? 1.45 : 1.8);
    const r = d3tree<VNode>()
      .nodeSize([104, 185])
      .separation((a, b) => (unit(a.data) + unit(b.data)) / 2 + (a.parent === b.parent ? 0.05 : 0.35))(h);
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
  const padX = 110;
  const width = Math.max(1100, maxX - minX + padX * 2);
  const groundH = 150; // 땅(뿌리) 영역
  const skyTop = 150; // 열매 위 라벨·잎 무리 여유
  const height = maxY + skyTop + groundH;
  const groundY = height - groundH;
  const X = (x: number) => x - minX + padX + (width - (maxX - minX + padX * 2)) / 2;
  const Y = (y: number) => groundY - 18 - y; // 뿌리가 아래
  const cx = X(r.x);

  const maxWeight = Math.max(1, ...r.children!.map((c) => c.data.weight));
  const branchW = (w: number) => 3 + Math.sqrt(w / maxWeight) * 22;

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

  // 잎 무리: 열매와 가지 끝 주변에 겹친 원
  const canopy = useMemo(() => {
    const blobs: { x: number; y: number; r: number; fill: string; o: number }[] = [];
    const leaves = r.descendants().filter((d) => d.data.type === 'fruit' || (d.data.type !== 'root' && d.data.type !== 'ordin' && !d.children));
    for (const d of leaves) {
      const rnd = seeded(d.data.key);
      const x = X(d.x);
      const y = Y(d.y);
      for (let i = 0; i < 5; i++) {
        blobs.push({
          x: x + (rnd() - 0.5) * 110,
          y: y - 20 + (rnd() - 0.6) * 80,
          r: 38 + rnd() * 34,
          fill: ['var(--canopy-1)', 'var(--canopy-2)', 'var(--canopy-3)'][i % 3],
          o: 0.55 + rnd() * 0.3,
        });
      }
    }
    return blobs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, width, height]);

  const linkPath = (l: { source: HierarchyPointNode<VNode>; target: HierarchyPointNode<VNode> }) => {
    const sx = l.source.data.type === 'root' ? cx + (X(l.target.x) - cx) * 0.12 : X(l.source.x);
    const sy = l.source.data.type === 'root' ? groundY + 6 : Y(l.source.y);
    const tx = X(l.target.x);
    const ty = Y(l.target.y);
    const my = (sy + ty) / 2;
    return `M${sx},${sy} C${sx},${my} ${tx},${my + 25} ${tx},${ty}`;
  };

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full min-w-[960px]"
          role="group"
          aria-label="법규 나무 조감도 (텍스트 대안: 체계트리)"
        >
          <title>대한적십자사 법규 나무</title>
          <defs>
            <linearGradient id="lt-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--sky-top)" />
              <stop offset="1" stopColor="var(--sky-bottom)" />
            </linearGradient>
            <linearGradient id="lt-soil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--soil-top)" />
              <stop offset="1" stopColor="var(--soil-bottom)" />
            </linearGradient>
            <linearGradient id="lt-bark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--bark)" />
              <stop offset="0.55" stopColor="var(--bark-light)" />
              <stop offset="1" stopColor="var(--bark)" />
            </linearGradient>
            <radialGradient id="lt-fruit" cx="0.35" cy="0.3" r="0.75">
              <stop offset="0" stopColor="var(--fruit-1)" />
              <stop offset="1" stopColor="var(--fruit-2)" />
            </radialGradient>
            <filter id="lt-shadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="var(--shadow)" />
            </filter>
            <filter id="lt-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* 하늘·땅 */}
          <rect x={0} y={0} width={width} height={groundY} fill="url(#lt-sky)" />
          <path d={`M0,${groundY + 10} Q${width * 0.25},${groundY - 14} ${width * 0.5},${groundY} T${width},${groundY - 6} V${height} H0 Z`} fill="url(#lt-soil)" />
          <path d={`M0,${groundY + 10} Q${width * 0.25},${groundY - 14} ${width * 0.5},${groundY} T${width},${groundY - 6}`} fill="none" stroke="var(--canopy-2)" strokeWidth={6} opacity={0.7} />

          {/* 뿌리 */}
          {[-1, 1].flatMap((dir) =>
            [0.18, 0.32, 0.5].map((f, i) => (
              <path
                key={`root-${dir}-${i}`}
                d={`M${cx},${groundY + 4} C${cx + dir * width * f * 0.25},${groundY + 30 + i * 12} ${cx + dir * width * f * 0.6},${groundY + 40 + i * 18} ${cx + dir * width * f},${groundY + 52 + i * 22}`}
                fill="none"
                stroke="var(--root)"
                strokeWidth={8 - i * 2}
                strokeLinecap="round"
                opacity={0.55}
              />
            )),
          )}

          {/* 잎 무리 (뒤) */}
          <g filter="url(#lt-soft)" aria-hidden>
            {canopy.map((b, i) => (
              <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.fill} opacity={b.o} />
            ))}
          </g>

          {/* 가지: 껍질 + 결 */}
          {r.links().map((l) => {
            const side = l.target.data.type === 'ordin';
            const d = linkPath(l);
            const w = side ? 2.5 : branchW(l.target.data.weight);
            return (
              <g key={`${l.source.data.key}-${l.target.data.key}`}>
                <path d={d} fill="none" stroke={side ? 'var(--local)' : 'var(--bark)'} strokeWidth={w} strokeDasharray={side ? '6 5' : undefined} strokeLinecap="round" opacity={side ? 0.85 : 1} />
                {!side && w > 6 && <path d={d} fill="none" stroke="var(--bark-light)" strokeWidth={w * 0.28} strokeLinecap="round" opacity={0.55} />}
              </g>
            );
          })}
          {/* 줄기 밑동 */}
          <path
            d={`M${cx - 34},${groundY + 8} C${cx - 20},${groundY - 30} ${cx - 14},${groundY - 60} ${cx - 12},${groundY - 90} L${cx + 12},${groundY - 90} C${cx + 14},${groundY - 60} ${cx + 20},${groundY - 30} ${cx + 34},${groundY + 8} Z`}
            fill="url(#lt-bark)"
          />

          {/* 노드 */}
          {r.descendants().map((d) => {
            const v = d.data;
            if (v.type === 'root') return null;
            const x = X(d.x);
            const y = Y(d.y);
            const norm = v.node?.norm;
            const count = norm ? (normById.get(norm.id)?.caseCount ?? 0) : 0;

            if (v.type === 'fruit') {
              const n = v.node?.count ?? 0;
              const rad = 19 + Math.sqrt(n) * 4.5;
              const lines = wrap(v.label, 8, 2);
              return (
                <g key={v.key} transform={`translate(${x},${y})`} role="link" tabIndex={0} aria-label={`${v.label} 기관규정 ${n}건`} onClick={() => go(v)} onKeyDown={keyAct(v)} className="lt-node cursor-pointer">
                  <path d={`M0,${-rad + 2} q2,-7 8,-9`} stroke="var(--bark)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                  <ellipse cx={13} cy={-rad - 7} rx={8} ry={4} transform={`rotate(-25 13 ${-rad - 7})`} fill="var(--canopy-2)" />
                  <circle r={rad} fill="url(#lt-fruit)" filter="url(#lt-shadow)" />
                  <ellipse cx={-rad * 0.35} cy={-rad * 0.4} rx={rad * 0.28} ry={rad * 0.18} fill="#fff" opacity={0.35} />
                  <text textAnchor="middle" y={6} fontSize={17} fontWeight={800} fill="#fff" className="tnum">
                    {n}
                  </text>
                  <text textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--text)" style={HALO}>
                    {lines.map((ln, i, arr) => (
                      <tspan key={i} x={0} y={-rad - 16 - (arr.length - 1 - i) * 16}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            if (v.type === 'ordin') {
              const label = `${v.label} ${v.node?.count}건`;
              const w = label.length * 12 + 40;
              return (
                <g key={v.key} transform={`translate(${x},${y})`} role="link" tabIndex={0} aria-label={`${label} — 조례 지역뷰`} onClick={() => go(v)} onKeyDown={keyAct(v)} className="lt-node cursor-pointer">
                  <rect x={-w / 2} y={-18} width={w} height={36} rx={18} fill="var(--local-bg)" stroke="var(--local)" strokeWidth={1.5} strokeDasharray="5 3" filter="url(#lt-shadow)" />
                  <text textAnchor="middle" y={5} fontSize={13} fontWeight={600} fill="var(--local)">
                    🗺 {label}
                  </text>
                </g>
              );
            }

            const isMain = norm?.level === 'L1_ACT' || norm?.level === 'L3_ARTICLES';
            const display = v.label.replace(/^대한적십자사 (?=조직법 )/, '');
            const fs = isMain ? 16 : 14;
            const lines = wrap(display, isMain ? 8 : 10);
            const w = Math.min(isMain ? 200 : 180, Math.max(96, Math.max(...lines.map((l) => l.length)) * (fs + 0.5) + 40));
            const h = 20 + lines.length * (fs + 4);
            const color = v.type === 'articles' ? 'var(--inst)' : 'var(--law)';
            return (
              <g key={v.key} transform={`translate(${x},${y})`} className="lt-node">
                <g role="button" tabIndex={0} aria-label={`${v.label} 상세 보기`} onClick={() => go(v)} onKeyDown={keyAct(v)} className="cursor-pointer">
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill="var(--plaque)" stroke={color} strokeWidth={isMain ? 2.5 : 1.5} filter="url(#lt-shadow)" />
                  <rect x={-w / 2} y={-h / 2} width={7} height={h} rx={3} fill={color} />
                </g>
                <a href={norm?.url} target="_blank" rel="noopener noreferrer" aria-label={`${v.label} 원문 (새 탭)`}>
                  <text textAnchor="middle" fontSize={fs} fontWeight={norm?.isCore ? 700 : 500} fill={color} className="hover:underline">
                    {lines.map((ln, i) => (
                      <tspan key={i} x={3} y={-h / 2 + 10 + fs + i * (fs + 4)}>
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
                    transform={`translate(${w / 2 - 6},${-h / 2})`}
                    onClick={() => norm && openDetail(norm.id, { tab: 'cases' })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && norm && openDetail(norm.id, { tab: 'cases' })}
                    className="cursor-pointer"
                  >
                    <rect x={-10} y={-13} width={48} height={26} rx={13} fill="var(--case-bg)" stroke="var(--case)" strokeWidth={1.5} filter="url(#lt-shadow)" />
                    <text x={14} y={5} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--case)" className="tnum">
                      ⚖ {count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 땅속 표지: 헌법 · 조약 */}
          <g transform={`translate(${cx},${groundY + 92})`}>
            {constitution?.norm && (
              <a href={constitution.norm.url} target="_blank" rel="noopener noreferrer" aria-label={`${constitution.norm.title} 원문 (새 탭)`}>
                <g transform="translate(-170,0)">
                  <rect x={-140} y={-22} width={280} height={44} rx={22} fill="var(--plaque)" stroke="var(--law)" strokeWidth={2} filter="url(#lt-shadow)" />
                  <text textAnchor="middle" y={6} fontSize={16} fontWeight={800} fill="var(--law)">
                    📜 {constitution.norm.title} ↗
                  </text>
                </g>
              </a>
            )}
            {treatyGroup && (
              <a href={withBase('/tree/?focus=%23treaties')} aria-label="제네바협약·국제인도법 조약 목록">
                <g transform="translate(170,0)">
                  <rect x={-150} y={-22} width={300} height={44} rx={22} fill="var(--plaque)" stroke="var(--law)" strokeWidth={2} filter="url(#lt-shadow)" />
                  <text textAnchor="middle" y={6} fontSize={15} fontWeight={700} fill="var(--law)">
                    🌐 제네바협약·국제인도법 조약 {treatyGroup.count}건
                  </text>
                </g>
              </a>
            )}
          </g>
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-muted">
        <span>
          <b className="text-law">▍</b> 법령 상자 = 상세 · 라벨 ↗ = 원문
        </span>
        <span>
          <b className="text-inst">●</b> 열매 = 분야별 기관규정 묶음(숫자 = 건수)
        </span>
        <span>
          <b className="text-local">┄</b> 점선 = 자치법규 곁가지
        </span>
        <span>
          <b className="text-case">⚖</b> = 연결된 판례·해석
        </span>
        <span>가지 굵기 = 품은 규범 수</span>
        <a className="ml-auto underline" href={withBase('/tree/')}>
          텍스트로 보기(체계트리)
        </a>
      </figcaption>
    </figure>
  );
}
