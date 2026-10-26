// 빌드타임 데이터 로더 (서버 컴포넌트 전용). 런타임 API 호출 없음(v1).
import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaseItem, ChangeSet, DatasetMeta, NormItem, RegionInfo, Relation } from '@/types/model';

const dir = join(process.cwd(), 'data', 'build');
const cache = new Map<string, unknown>();
function load<T>(name: string): T {
  if (!cache.has(name)) cache.set(name, JSON.parse(readFileSync(join(dir, name), 'utf8')));
  return cache.get(name) as T;
}

export const getNorms = () => load<NormItem[]>('norms.json');
export const getCases = () => load<CaseItem[]>('cases.json');
export const getRelations = () => load<Relation[]>('relations.json');
export const getMeta = () => load<DatasetMeta>('meta.json');
export const getChanges = () => load<ChangeSet>('changes.json');
export const getRegions = () => load<RegionInfo[]>('regions.json');

import YAML from 'yaml';
export function getAliases(): string[][] {
  const t = YAML.parse(readFileSync(join(process.cwd(), 'data', 'taxonomy.yaml'), 'utf8')) as { aliases?: string[][] };
  return t.aliases ?? [];
}

export interface BookEntry {
  title: string;
  note?: string; // 법규집에 적힌 개정·폐지 정보
  url: string; // 법규집 뷰어
}
export interface OfficialOrder {
  source: string;
  checkedAt: string;
  parts: { no: string; title: string; items: BookEntry[] }[];
  groups: { 법령: string[]; 정관: string[]; 운영규정: string[]; 시행규칙: string[] };
  aliases: Record<string, string>;
}
/** 대한적십자사 법규집 편제 순서 (data/krc-order.yaml) */
export function getOfficialOrder(): OfficialOrder {
  const y = YAML.parse(readFileSync(join(process.cwd(), 'data', 'krc-order.yaml'), 'utf8'));
  const parts: OfficialOrder['parts'] = y.parts;
  const titles = (name: string) => parts.find((p) => p.title === name)?.items.map((i) => i.title) ?? [];
  return {
    source: y.source,
    checkedAt: y.checkedAt,
    parts,
    groups: { 법령: titles('법령'), 정관: titles('정관'), 운영규정: titles('운영규정'), 시행규칙: titles('시행규칙') },
    aliases: y.aliases ?? {},
  };
}

/** 정규화된 명칭 → 법규집 순번 (편제 전체에서 연속 번호) */
export function getOrderRank(): Record<string, number> {
  const o = getOfficialOrder();
  const rank: Record<string, number> = {};
  let i = 0;
  for (const t of [...o.groups.법령, ...o.groups.정관, ...o.groups.운영규정, ...o.groups.시행규칙]) rank[t.replace(/\s/g, '')] = ++i;
  for (const [from, to] of Object.entries(o.aliases)) if (rank[to.replace(/\s/g, '')]) rank[from.replace(/\s/g, '')] = rank[to.replace(/\s/g, '')];
  return rank;
}
