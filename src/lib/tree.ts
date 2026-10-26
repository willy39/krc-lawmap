// 규범 위계 트리 구성 (트리 목록·법규 체계도 공용)
import type { FieldCode, NormItem, OrdinanceBundle } from '@/types/model';
import { BUNDLE_NAMES, FIELD_NAMES } from './labels';

export interface TreeNode {
  key: string;
  label: string;
  norm?: NormItem;
  kind: 'norm' | 'field' | 'ordin' | 'orphan';
  href?: string;
  count?: number;
  field?: FieldCode;
  children: TreeNode[];
}

export function buildTree(norms: NormItem[], rank: Record<string, number> = {}): TreeNode[] {
  const children = new Map<string | null, NormItem[]>();
  for (const n of norms) {
    const k = n.parentId;
    if (!children.has(k)) children.set(k, []);
    children.get(k)!.push(n);
  }
  // 기관규정은 법규집 편제 순서, 그 외는 위계·핵심 여부·가나다
  const r = (n: NormItem) => rank[n.title.replace(/\s/g, '')] ?? 9999;
  const order = (a: NormItem, b: NormItem) =>
    a.level.localeCompare(b.level) || (a.source === 'pi' && b.source === 'pi' ? r(a) - r(b) : 0) || Number(b.isCore) - Number(a.isCore) || a.title.localeCompare(b.title, 'ko');

  const make = (n: NormItem): TreeNode => {
    const kids = (children.get(n.id) ?? []).sort(order);
    const ordin = kids.filter((k) => k.source === 'ordin');
    const rest = kids.filter((k) => k.source !== 'ordin');
    const nodes: TreeNode[] = [];

    if (n.level === 'L3_ARTICLES') {
      // 정관 아래 규정은 업무분야별 묶음으로
      const byField = new Map<FieldCode, NormItem[]>();
      for (const r of rest) {
        if (!byField.has(r.primaryField)) byField.set(r.primaryField, []);
        byField.get(r.primaryField)!.push(r);
      }
      for (const [f, list] of [...byField.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        nodes.push({ key: `${n.id}#${f}`, label: FIELD_NAMES[f], kind: 'field', field: f, count: list.length, children: list.map(make) });
      }
    } else {
      nodes.push(...rest.map(make));
    }

    const bundles = new Map<OrdinanceBundle, number>();
    for (const o of ordin) bundles.set(o.bundle ?? 'etc', (bundles.get(o.bundle ?? 'etc') ?? 0) + 1);
    for (const [b, cnt] of bundles) {
      nodes.push({
        key: `${n.id}#ordin-${b}`,
        label: `자치법규 — ${BUNDLE_NAMES[b]} 조례`,
        kind: 'ordin',
        count: cnt,
        href: `/local/?bundle=${b}`,
        children: [],
      });
    }
    return { key: n.id, label: n.shortTitle ?? n.title, norm: n, kind: 'norm', children: nodes };
  };

  const roots = (children.get(null) ?? []).sort(order);
  const top = roots.filter((r) => r.level === 'L0_CONSTITUTION').map(make);
  // 조약은 하나의 묶음 노드 아래로 (핵심 조약 먼저)
  const treaties = roots.filter((r) => r.level === 'L0_TREATY').sort((a, b) => Number(b.isCore) - Number(a.isCore) || (a.effectiveAt ?? '').localeCompare(b.effectiveAt ?? ''));
  if (treaties.length) {
    const total = norms.filter((n) => n.source === 'trty').length;
    top.push({ key: '#treaties', label: '조약 — 제네바협약·국제인도법', kind: 'field', field: 'INT', count: total, children: treaties.map(make) });
  }
  const orphans = roots.filter((r) => r.level !== 'L0_CONSTITUTION' && r.level !== 'L0_TREATY');
  if (orphans.length) {
    top.push({ key: '#orphan', label: '상위 근거 미지정', kind: 'orphan', count: orphans.length, children: orphans.map(make) });
  }
  return top;
}

/** id → 조상 key 목록 (트리 목록 focus 펼침용) */
export function ancestorsOf(tree: TreeNode[], key: string): string[] | null {
  for (const n of tree) {
    if (n.key === key) return [];
    const sub = ancestorsOf(n.children, key);
    if (sub) return [n.key, ...sub];
  }
  return null;
}
