// 위계·분야 분류 및 상하 관계 판정 (설계서 3.5, 3.6)
import type { FieldCode, Level, NormItem, OrdinanceBundle, RegionInfo } from '../../src/types/model.ts';
import { normalizeLawName, parsePurposeParents } from './citation.ts';

export type FieldDict = Record<FieldCode, { name: string; keywords: string[] }>;

/** 제목 키워드로 1차 분야 분류. 가장 먼저·많이 맞는 분야가 primary */
export function classifyFields(text: string, dict: FieldDict): { primary: FieldCode; secondary: FieldCode[] } {
  const hits: { code: FieldCode; pos: number }[] = [];
  for (const [code, def] of Object.entries(dict) as [FieldCode, FieldDict[FieldCode]][]) {
    let pos = Infinity;
    for (const kw of def.keywords) {
      const i = text.indexOf(kw);
      if (i >= 0 && i < pos) pos = i;
    }
    if (pos !== Infinity) hits.push({ code, pos });
  }
  hits.sort((a, b) => a.pos - b.pos);
  if (hits.length === 0) return { primary: 'ETC', secondary: [] };
  return { primary: hits[0].code, secondary: hits.slice(1).map((h) => h.code) };
}

/** 공공기관 규정(pi) 명칭으로 위계 판정 */
export function piLevel(title: string): Level {
  if (/정관$/.test(title)) return 'L3_ARTICLES';
  if (/(시행규칙|시행세칙|세칙)$/.test(title)) return 'L5_RULE';
  if (/(지침|요령|기준|매뉴얼)$/.test(title)) return 'L6_GUIDELINE';
  return 'L4_REGULATION';
}

/** 자치법규 종류 → 위계 */
export function ordinanceLevel(kind: string): Level {
  return /규칙|훈령|예규/.test(kind) ? 'LO_ORD_RULE' : 'LO_ORDINANCE';
}

/**
 * 기관규정 부모 판정: "○○규정 시행규칙" → "○○규정", 그 외 규정 → 정관, 정관 → 조직법
 * (기관 접두어 "대한적십자사 "는 비교 시 무시)
 */
export function piParent(item: Pick<NormItem, 'title' | 'level'>, pool: Pick<NormItem, 'id' | 'title' | 'level'>[], orgActId: string | null): string | null {
  // 실측 명명 규칙: "대한적십자사 ○○ 운영규정" ↔ "대한적십자사 ○○ 시행규칙", "○○규정" ↔ "○○규정 시행규칙"
  const strip = (s: string) => normalizeLawName(s.replace(/^대한적십자사\s*/, ''));
  const stem = (s: string) => strip(s).replace(/(운영규정|규정|시행규칙|시행세칙|세칙)$/, '');
  if (item.level === 'L3_ARTICLES') return orgActId;
  if (item.level === 'L5_RULE') {
    const base = item.title.replace(/\s*(시행규칙|시행세칙|세칙)$/, '');
    const exact = pool.find((p) => p.title !== item.title && strip(p.title) === strip(base));
    if (exact) return exact.id;
    const sameStem = pool.find((p) => p.level === 'L4_REGULATION' && stem(p.title) === stem(item.title));
    if (sameStem) return sameStem.id;
  }
  const articles = pool.find((p) => p.level === 'L3_ARTICLES');
  return articles ? articles.id : null;
}

/** 지자체기관명 → 지역 메타 */
export function resolveRegion(
  agency: string,
  sidoList: (RegionInfo & { aliases?: string[] })[],
): NormItem['region'] | undefined {
  const a = agency.replace(/\s+/g, ' ').trim();
  const bare = a.replace(/^\(구\)/, '');
  for (const s of sidoList) {
    const names = [s.sido, ...(s.aliases ?? [])];
    const hit = names.find((n) => a.startsWith(n)) ?? names.find((n) => bare.startsWith(n));
    if (!hit) continue;
    const rest = (a.startsWith(hit) ? a : bare).slice(hit.length).trim();
    if (/교육청/.test(rest) || /교육청$/.test(a)) return { sido: s.sido, code: s.code, type: 'edu' };
    if (rest) return { sido: s.sido, sigungu: rest, code: s.code, type: 'sigungu' };
    return { sido: s.sido, code: s.code, type: 'sido' };
  }
  return undefined;
}

/** 자치법규 부모 판정: 제1조(목적) 「」 인용 → 실패 시 묶음 기본 부모 */
export function ordinanceParent(
  purpose: string | undefined,
  bundle: OrdinanceBundle,
  laws: Pick<NormItem, 'id' | 'title'>[],
  bundleDefaults: Partial<Record<OrdinanceBundle, string | null>>,
): string | null {
  const byName = new Map(laws.map((l) => [normalizeLawName(l.title), l.id]));
  for (const name of parsePurposeParents(purpose)) {
    const id = byName.get(normalizeLawName(name));
    if (id) return id;
  }
  const def = bundleDefaults[bundle];
  if (!def) return null;
  return byName.get(normalizeLawName(def)) ?? null;
}
