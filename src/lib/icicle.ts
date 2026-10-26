// B2 아이시클 데이터 — 헌법 띠가 아래로 쪼개지며, 칸 폭 = 딸린 규범 수
//   0행: 대한민국헌법 | 조약(제네바협약·국제인도법) | (상위 미지정)
//   1행: 근거·관련 법률 | 조약 분류
//   2행: 시행령·정관·행정규칙(묶음)·자치법규(묶음)
//   3행: 정관 아래 업무분야 — 그 아래 운영규정·시행규칙은 칸을 고르면 목록으로 연다
import type { NormItem } from '@/types/model';
import { BUNDLE_NAMES, FIELD_NAMES } from './labels';
import { buildTree, type TreeNode } from './tree';

export type CellKind = 'root' | 'law' | 'decree' | 'articles' | 'field' | 'admrul' | 'ordin' | 'treaties' | 'treatyGroup' | 'orphan';

export interface Cell {
  key: string;
  label: string;
  kind: CellKind;
  norm?: NormItem; // 칸 자체가 규범인 경우
  items: NormItem[]; // 이 칸에 딸린 모든 규범(자기 포함) — 아래 목록
  weight: number; // 폭 (규범 수)
  children: Cell[];
}

const TREATY_GROUPS: { key: string; label: string; re: RegExp }[] = [
  { key: 'geneva', label: '제네바협약·추가의정서·적십자', re: /제네바협약|국제적십자위원회|병원선/ },
  { key: 'weapons', label: '무기 사용 규제', re: /무기|가스|파편|지뢰|전쟁잔류폭발물/ },
  { key: 'other', label: '헤이그·국제형사·아동', re: /./ },
];

function collect(n: TreeNode, ordinById: Map<string, NormItem[]>): NormItem[] {
  const out: NormItem[] = n.norm ? [n.norm] : [];
  if (n.kind === 'ordin') out.push(...(ordinById.get(n.key) ?? []));
  for (const c of n.children) out.push(...collect(c, ordinById));
  return out;
}

export interface IcicleOptions {
  /** true: 조례도 실제 건수만큼 폭을 차지 / false: 조례 칸은 고정 최소 폭 */
  ordinancesProportional: boolean;
}

export function buildIcicle(norms: NormItem[], rank: Record<string, number>, opts: IcicleOptions): Cell {
  const tree = buildTree(norms, rank);
  // TreeNode 의 자치법규 묶음 노드(key = `${lawId}#ordin-${bundle}`) → 실제 조례 목록
  const ordinById = new Map<string, NormItem[]>();
  for (const o of norms.filter((x) => x.source === 'ordin')) {
    const k = `${o.parentId}#ordin-${o.bundle ?? 'etc'}`;
    if (!ordinById.has(k)) ordinById.set(k, []);
    ordinById.get(k)!.push(o);
  }
  const ORDIN_FIXED = 8;
  const w = (items: NormItem[]) =>
    opts.ordinancesProportional ? items.length : items.filter((i) => i.source !== 'ordin').length;

  const lawCell = (n: TreeNode, depth: number): Cell => {
    const kids: Cell[] = [];
    const admrul: TreeNode[] = [];
    for (const c of n.children) {
      if (c.kind === 'ordin') {
        const items = ordinById.get(c.key) ?? [];
        kids.push({
          key: c.key,
          label: `${BUNDLE_NAMES[(c.key.split('#ordin-')[1] as keyof typeof BUNDLE_NAMES) ?? 'etc']} 조례`,
          kind: 'ordin',
          items,
          weight: opts.ordinancesProportional ? items.length : ORDIN_FIXED,
          children: [],
        });
      } else if (c.kind === 'field') {
        const items = collect(c, ordinById);
        kids.push({ key: c.key, label: FIELD_NAMES[c.field!] ?? c.label, kind: 'field', items, weight: w(items), children: [] });
      } else if (c.norm?.source === 'admrul') {
        admrul.push(c);
      } else if (c.norm) {
        kids.push(lawCell(c, depth + 1));
      }
    }
    if (admrul.length) {
      const items = admrul.flatMap((a) => collect(a, ordinById));
      kids.push({ key: `${n.key}#admrul`, label: '행정규칙', kind: 'admrul', items, weight: w(items), children: [] });
    }
    const items = collect(n, ordinById);
    const kind: CellKind = n.norm?.level === 'L3_ARTICLES' ? 'articles' : n.norm?.level === 'L2_DECREE' || /시행령|시행규칙$/.test(n.norm?.title ?? '') ? 'decree' : 'law';
    const own = kids.reduce((s, k) => s + k.weight, 0);
    return { key: n.key, label: n.label, kind, norm: n.norm, items, weight: Math.max(1, own + 1), children: kids };
  };

  const rootCells: Cell[] = [];
  for (const t of tree) {
    if (t.norm?.level === 'L0_CONSTITUTION') {
      const c = lawCell(t, 0);
      c.kind = 'root';
      rootCells.push(c);
    } else if (t.key === '#treaties') {
      const all = collect(t, ordinById);
      const tops = t.children; // 본 조약(개정·유보 문서는 하위)
      const used = new Set<string>();
      const groups: Cell[] = TREATY_GROUPS.map((g) => {
        const mine = tops.filter((x) => !used.has(x.key) && g.re.test(x.norm?.title ?? ''));
        mine.forEach((x) => used.add(x.key));
        const items = mine.flatMap((x) => collect(x, ordinById));
        return { key: `#treaties-${g.key}`, label: g.label, kind: 'treatyGroup' as const, items, weight: items.length, children: [] };
      }).filter((g) => g.items.length);
      rootCells.push({ key: '#treaties', label: '조약 — 제네바협약·국제인도법', kind: 'treaties', items: all, weight: Math.max(1, all.length), children: groups });
    } else if (t.key === '#orphan') {
      const items = collect(t, ordinById);
      rootCells.push({ key: '#orphan', label: '상위 근거 미지정', kind: 'orphan', items, weight: w(items) || 1, children: [] });
    }
  }
  return { key: '#all', label: '전체', kind: 'root', items: norms, weight: rootCells.reduce((s, c) => s + c.weight, 0), children: rootCells };
}

/** key → 루트부터의 경로 */
export function pathTo(root: Cell, key: string): Cell[] | null {
  if (root.key === key) return [root];
  for (const c of root.children) {
    const p = pathTo(c, key);
    if (p) return [root, ...p];
  }
  return null;
}

export function findCell(root: Cell, pred: (c: Cell) => boolean): Cell | null {
  if (pred(root)) return root;
  for (const c of root.children) {
    const f = findCell(c, pred);
    if (f) return f;
  }
  return null;
}
