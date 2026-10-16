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
