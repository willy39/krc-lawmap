// 수집 단계의 중간 산출물(초안) 타입. 분류·연결·점수화를 거쳐 NormItem / CaseItem 이 된다.
import type { CaseSource, FieldCode, Level, NormItem, NormSource, OrdinanceBundle } from '../../src/types/model.ts';

export interface NormDraft {
  id: string;
  source: NormSource;
  sourceId: string;
  title: string;
  kind: string;
  agency: string;
  url: string;
  level?: Level;
  field?: FieldCode;
  isCore?: boolean;
  parentName?: string; // 큐레이션된 부모 법령명
  purpose?: string; // 자치법규 제1조(목적)
  bundle?: OrdinanceBundle;
  promulgatedAt?: string;
  effectiveAt?: string;
  revisionType?: string;
  upcoming?: { effectiveAt: string };
  articles?: NormItem['articles'];
  demo?: boolean;
}

export interface CaseDraft {
  id: string;
  source: CaseSource;
  sourceId: string;
  docNo: string;
  title: string;
  issuer: string;
  decidedAt: string;
  outcome?: string;
  summary?: string;
  citedRaw?: string; // 참조조문 원문
  party?: string; // 당사자·질의기관
  body?: string; // 관련성 판정용 본문 일부 (저장하지 않음)
  matchedQueries?: string[]; // 이 항목을 찾아낸 본문 검색어 (검색어가 본문에 있다는 근거)
  url: string;
  demo?: boolean;
}

/** API 날짜(YYYYMMDD / YYYY.MM.DD / YYYY-MM-DD) → YYYY-MM-DD */
export function isoDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const d = v.replace(/[^\d]/g, '');
  // 9999-12-31 은 API 의 '미정' 표기 — 날짜로 쓰지 않는다
  if (d.length !== 8 || d.startsWith('9999')) return undefined;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export function stripTags(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
