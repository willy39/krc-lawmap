import { describe, expect, it } from 'vitest';
import { DOCNO_RE, expandQuery, searchAll } from '../../src/lib/search.ts';
import type { CaseItem, NormItem } from '../../src/types/model.ts';

const norm = (id: string, title: string): NormItem => ({
  id, source: 'pi', sourceId: id, title, kind: '규정', level: 'L4_REGULATION', primaryField: 'FIN', secondaryFields: [],
  parentId: null, agency: '대한적십자사', url: 'https://www.law.go.kr', isCore: false, caseCount: 0, flags: [],
});
const kase = (id: string, docNo: string, title: string): CaseItem => ({
  id, source: 'prec', sourceId: id, docNo, title, issuer: '대법원', decidedAt: '2021-03-11', citedLaws: [], fields: [],
  issueTags: [], relevance: 90, review: 'approved', url: 'https://www.law.go.kr',
});

describe('search', () => {
  it('사건번호 패턴 인식', () => {
    expect(DOCNO_RE.test('2019다12345')).toBe(true);
    expect(DOCNO_RE.test('23-0456')).toBe(true);
    expect(DOCNO_RE.test('인사규정')).toBe(false);
  });
  it('사건번호는 최상위', () => {
    const hits = searchAll('2019다12345', [norm('a', '2019 규정')], [kase('prec:1', '2019다12345', '손해배상')], []);
    expect(hits[0].group).toBe('판례·해석');
  });
  it('별칭 확장: 회비 → 적십자회비', () => {
    expect(expandQuery('회비', [['회비', '적십자회비']])).toContain('적십자회비');
    const hits = searchAll('회비', [norm('n1', '적십자회비 관리규정')], [], [['회비', '적십자회비']]);
    expect(hits.filter((h) => h.group === '기관규정').length).toBe(1);
    expect(hits.some((h) => h.group === '분야')).toBe(true);
  });
});
