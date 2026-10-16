import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import type { FieldCode, Level, OrdinanceBundle, RegionInfo, ReviewStatus } from '../../src/types/model.ts';
import type { FieldDict } from './classify.ts';
import type { RelevanceConfig } from './score.ts';

export const ROOT = join(import.meta.dirname, '..', '..');
export const DATA = join(ROOT, 'data');
export const BUILD = join(DATA, 'build');

function y<T>(file: string): T {
  return YAML.parse(readFileSync(join(DATA, file), 'utf8')) as T;
}

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export interface CuratedLaw {
  name: string;
  field: FieldCode;
  level?: Level;
  parent?: string;
  isCore?: boolean;
}

export interface Overrides {
  items: Record<string, Partial<{ shortTitle: string; primaryField: FieldCode; isCore: boolean; parentId: string }>>;
  core_laws: CuratedLaw[];
  curated_laws: CuratedLaw[];
  admrul_queries: string[];
  admrul_title_filter?: string;
  admrul_parent_rules?: { pattern: string; parent: string }[];
  pi_agency: string;
  pi_target?: string;
  cgm_targets?: { ministry: string; target: string }[];
  ordinance_bundles: Record<Exclude<OrdinanceBundle, 'etc'>, { queries: string[]; parent: string | null; requireBody: boolean }>;
}

export interface ReviewEntry {
  review?: ReviewStatus;
  issueTags?: string[];
  about?: string[];
  fields?: FieldCode[];
  note?: string;
}

export interface Config {
  taxonomy: { fields: FieldDict; aliases: string[][]; issueTags: string[] };
  regions: { sido: (RegionInfo & { aliases?: string[] })[] };
  relevance: RelevanceConfig;
  overrides: Overrides;
  review: Record<string, ReviewEntry>;
}

export function loadConfig(): Config {
  return {
    taxonomy: y('taxonomy.yaml'),
    regions: y('regions.yaml'),
    relevance: y('relevance.yaml'),
    overrides: y('overrides.yaml'),
    review: y<Record<string, ReviewEntry> | null>('review.yaml') ?? {},
  };
}

export function curatedLawNames(cfg: Config): string[] {
  return cfg.overrides.curated_laws.map((l) => l.name);
}
