// 법규집 'VI. 유관법령조문' 연계용 최신 법령 메타 (근로기준법 등) — 체계도·검색에는 넣지 않고 법규집에만 쓴다
import { join } from 'node:path';
import { lawUrl } from '../../src/lib/links.ts';
import type { BookLaw } from '../../src/types/model.ts';
import { BUILD, readJson, type Config } from '../lib/config.ts';
import { isoDate } from '../lib/drafts.ts';
import { normalizeLawName } from '../lib/citation.ts';
import { pick, search, type LawApiOptions } from '../lib/lawApi.ts';

export async function collectBookLaws(cfg: Config, api: LawApiOptions): Promise<BookLaw[]> {
  const prev = readJson<BookLaw[]>(join(BUILD, 'book-laws.json'), []);
  const out: BookLaw[] = [];
  for (const name of cfg.overrides.book_laws ?? []) {
    try {
      const { items } = await search({ target: 'law', query: name }, api);
      const hit = items.find((i) => normalizeLawName(pick(i, ['법령명한글', '법령명']) ?? '') === normalizeLawName(name));
      if (!hit) throw new Error('정확히 일치하는 법령 없음');
      out.push({
        name,
        kind: pick(hit, ['법령구분명']) ?? '',
        agency: pick(hit, ['소관부처명']) ?? '',
        promulgatedAt: isoDate(pick(hit, ['공포일자'])),
        effectiveAt: isoDate(pick(hit, ['시행일자'])),
        revisionType: pick(hit, ['제개정구분명']),
        url: lawUrl(name),
      });
    } catch (e) {
      // 실패 시 직전 값 유지 — 빈 결과를 '없음'으로 확정하지 않는다
      const p = prev.find((x) => x.name === name);
      console.error(`  ✗ 법규집 연계 법령 ${name}: ${e instanceof Error ? e.message : e}${p ? ' → 직전 값 유지' : ''}`);
      if (p) out.push(p);
    }
  }
  return out;
}
