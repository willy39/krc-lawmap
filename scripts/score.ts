// 관련성 점수 + review.yaml 병합 → 노출 여부 (설계서 3.4)
import type { CaseItem, FieldCode } from '../src/types/model.ts';
import { curatedLawNames, type Config } from './lib/config.ts';
import { classifyFields } from './lib/classify.ts';
import { relevanceScore, reviewStatus } from './lib/score.ts';
import type { NormalizedCase } from './normalize.ts';

export interface ScoredCase extends CaseItem {
  citations: NormalizedCase['citations'];
}

export function scoreCases(cases: NormalizedCase[], cfg: Config): ScoredCase[] {
  const curated = curatedLawNames(cfg);
  const out: ScoredCase[] = [];
  for (const c of cases) {
    const manual = cfg.review[c.id];
    const relevance = relevanceScore(
      { title: c.title, party: c.party, body: [c.summary, c.body].filter(Boolean).join('\n'), citedLaws: c.citations, curatedLawNames: curated },
      cfg.relevance,
    );
    const status = reviewStatus(relevance, cfg.relevance, manual?.review);
    if (!status) continue;
    const auto = classifyFields(`${c.title} ${c.summary ?? ''}`, cfg.taxonomy.fields);
    const fields: FieldCode[] = manual?.fields ?? [auto.primary, ...auto.secondary.slice(0, 2)];
    out.push({
      id: c.id,
      source: c.source,
      sourceId: c.sourceId,
      docNo: c.docNo,
      title: c.title,
      issuer: c.issuer,
      decidedAt: c.decidedAt,
      outcome: c.outcome,
      summary: c.summary,
      citedLaws: c.citations.map((x) => ({ lawName: x.lawName, article: x.article })),
      fields,
      issueTags: manual?.issueTags ?? [],
      relevance,
      review: status,
      url: c.url,
      demo: c.demo,
      citations: c.citations,
    });
  }
  return out;
}
