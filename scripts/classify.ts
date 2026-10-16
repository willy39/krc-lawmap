// 규범 초안 → NormItem: 위계·분야 태그·부모 판정·플래그 + overrides.yaml 병합 (설계서 3.1, 3.5, 3.6)
import type { NormItem, OrdinanceBundle } from '../src/types/model.ts';
import type { Config } from './lib/config.ts';
import type { NormDraft } from './lib/drafts.ts';
import { classifyFields, ordinanceLevel, ordinanceParent, piLevel, piParent, resolveRegion } from './lib/classify.ts';
import { normalizeLawName } from './lib/citation.ts';

const RECENT_DAYS = 90;

export function classifyNorms(drafts: NormDraft[], cfg: Config, today = new Date()): NormItem[] {
  const dict = cfg.taxonomy.fields;
  const todayIso = today.toISOString().slice(0, 10);
  const recentIso = new Date(today.getTime() - RECENT_DAYS * 864e5).toISOString().slice(0, 10);

  const items: NormItem[] = drafts.map((d) => {
    const fields = classifyFields(d.title, dict);
    let level = d.level;
    if (!level) {
      if (d.source === 'pi') level = piLevel(d.title);
      else if (d.source === 'ordin') level = ordinanceLevel(d.kind);
      else if (d.source === 'admrul') level = 'L1A_ADMRULE';
      else if (d.source === 'trty') level = 'L0_TREATY';
      else level = 'L1R_RELATED';
    }
    const primary = d.field ?? fields.primary;
    return {
      id: d.id,
      source: d.source,
      sourceId: d.sourceId,
      title: d.title,
      shortTitle: d.source === 'pi' ? d.title.replace(/^대한적십자사\s*/, '') : undefined,
      kind: d.kind,
      level,
      primaryField: primary,
      secondaryFields: fields.secondary.filter((f) => f !== primary),
      parentId: null,
      agency: d.agency,
      region: d.source === 'ordin' ? resolveRegion(d.agency || d.title, cfg.regions.sido) : undefined,
      bundle: d.bundle,
      promulgatedAt: d.promulgatedAt,
      effectiveAt: d.effectiveAt,
      revisionType: d.revisionType,
      upcoming: d.upcoming,
      articles: d.articles,
      url: d.url,
      isCore: d.isCore ?? false,
      caseCount: 0,
      flags: [],
      demo: d.demo,
    };
  });

  const byName = new Map(items.filter((i) => i.source === 'law' || i.source === 'trty').map((i) => [normalizeLawName(i.title), i.id]));
  const constitution = items.find((i) => i.level === 'L0_CONSTITUTION')?.id ?? null;
  const orgAct = items.find((i) => i.level === 'L1_ACT')?.id ?? null;
  const pis = items.filter((i) => i.source === 'pi');
  const laws = items.filter((i) => i.source === 'law');
  const bundleDefaults = Object.fromEntries(
    Object.entries(cfg.overrides.ordinance_bundles).map(([k, v]) => [k, v.parent]),
  ) as Partial<Record<OrdinanceBundle, string | null>>;

  for (const [idx, item] of items.entries()) {
    const d = drafts[idx];
    switch (item.source) {
      case 'law':
        if (item.level === 'L0_CONSTITUTION') item.parentId = null;
        else if (d.parentName) item.parentId = byName.get(normalizeLawName(d.parentName)) ?? null;
        else item.parentId = constitution;
        break;
      case 'trty':
        item.parentId = null;
        break;
      case 'pi':
        item.parentId = piParent(item, pis, orgAct, d.purpose);
        break;
      case 'ordin':
        item.parentId = ordinanceParent(d.purpose, item.bundle ?? 'etc', laws, bundleDefaults);
        break;
      case 'admrul': {
        // 제목에 큐레이션 법령명이 있으면 그 법령, 없으면 overrides.yaml 키워드 규칙
        const law = laws
          .filter((l) => l.level !== 'L0_CONSTITUTION' && normalizeLawName(item.title).includes(normalizeLawName(l.title)))
          .sort((a, b) => b.title.length - a.title.length)[0];
        const rule = cfg.overrides.admrul_parent_rules?.find((r) => new RegExp(r.pattern).test(item.title));
        item.parentId = law?.id ?? (rule ? (byName.get(normalizeLawName(rule.parent)) ?? null) : null);
        break;
      }
    }

    const ov = cfg.overrides.items?.[item.id];
    if (ov) Object.assign(item, ov);

    if (item.effectiveAt && item.effectiveAt >= recentIso && item.effectiveAt <= todayIso) item.flags.push('RECENT');
    if (item.upcoming || (item.effectiveAt && item.effectiveAt > todayIso)) item.flags.push('UPCOMING');
    const rootLevel = item.level === 'L0_CONSTITUTION' || item.level === 'L0_TREATY';
    if (!rootLevel && !item.parentId) item.flags.push('NO_PARENT');
  }
  return items;
}
