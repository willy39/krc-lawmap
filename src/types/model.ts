// 설계서 6장 데이터 모델 — 수집 파이프라인(scripts/)과 프론트엔드(src/)가 공유한다.

export type NormSource = 'law' | 'eflaw' | 'admrul' | 'ordin' | 'trty' | 'pi';
export type CaseSource = 'prec' | 'detc' | 'expc' | 'cgm' | 'pre' | 'decc';

export const NORM_SOURCES: NormSource[] = ['law', 'eflaw', 'admrul', 'ordin', 'trty', 'pi'];
export const CASE_SOURCES: CaseSource[] = ['prec', 'detc', 'expc', 'cgm', 'pre', 'decc'];

export type Level =
  | 'L0_CONSTITUTION' | 'L0_TREATY'
  | 'L1_ACT' | 'L2_DECREE' | 'L1R_RELATED' | 'L1A_ADMRULE'
  | 'LO_ORDINANCE' | 'LO_ORD_RULE'
  | 'L3_ARTICLES' | 'L4_REGULATION' | 'L5_RULE' | 'L6_GUIDELINE';

export const FIELD_CODES = ['ORG', 'HR', 'PAY', 'FIN', 'AUD', 'BLD', 'MED', 'DIS', 'VOL', 'INT', 'INF', 'ETC'] as const;
export type FieldCode = (typeof FIELD_CODES)[number];

export type NormFlag = 'RECENT' | 'UPCOMING' | 'NO_PARENT' | 'LINK_BROKEN';

/** 자치법규 묶음(설계서 3.2) */
export type OrdinanceBundle = 'redcross' | 'blood' | 'disaster' | 'family' | 'etc';

/** 규범 축 */
export interface NormItem {
  id: string;
  source: NormSource;
  sourceId: string;
  title: string;
  shortTitle?: string;
  kind: string;
  level: Level;
  primaryField: FieldCode;
  secondaryFields: FieldCode[];
  parentId: string | null;
  agency: string;
  region?: { sido: string; sigungu?: string; code?: string; type?: 'sido' | 'sigungu' | 'edu' };
  bundle?: OrdinanceBundle;
  promulgatedAt?: string;
  effectiveAt?: string;
  revisionType?: string;
  upcoming?: { effectiveAt: string };
  articles?: { no: string; title: string }[];
  url: string;
  isCore: boolean;
  caseCount: number;
  flags: NormFlag[];
  demo?: boolean;
}

export type ReviewStatus = 'auto' | 'candidate' | 'approved' | 'rejected';

/** 해석·적용 축 */
export interface CaseItem {
  id: string;
  source: CaseSource;
  sourceId: string;
  docNo: string;
  title: string;
  issuer: string;
  decidedAt: string;
  outcome?: string;
  summary?: string;
  citedLaws: { lawName: string; article?: string; normId?: string }[];
  fields: FieldCode[];
  issueTags: string[];
  relevance: number;
  review: ReviewStatus;
  url: string;
  demo?: boolean;
}

/** 축 간 연결 */
export interface Relation {
  from: string; // CaseItem.id
  to: string; // NormItem.id
  article?: string;
  type: 'CITES' | 'ABOUT';
}

export interface DatasetMeta {
  baseDate: string;
  generatedAt: string;
  mode: 'live' | 'seed';
  counts: {
    norms: Record<NormSource, number> & { total: number };
    cases: Record<CaseSource, number> & { total: number; candidate: number };
  };
  apiTotalCnt: { pi: number | null };
  brokenLinks: number;
  unverifiedLinks: number;
  /** 판례·해석 노출 기준 (data/relevance.yaml) */
  relevance?: { auto: number; candidate: number };
}

export interface ChangeEntry {
  kind: 'NORM_ADDED' | 'NORM_REVISED' | 'NORM_REMOVED' | 'CASE_ADDED';
  id: string;
  title: string;
  date?: string;
  detail?: string;
}

export interface ChangeSet {
  generatedAt: string;
  previousGeneratedAt: string | null;
  entries: ChangeEntry[];
}

export interface RegionInfo {
  sido: string;
  short: string;
  code: string;
}

/** 법규집 유관법령(근로기준법 등)과 연계할 최신 법령 메타 (data/build/book-laws.json) */
export interface BookLaw {
  name: string;
  kind: string;
  agency: string;
  promulgatedAt?: string;
  effectiveAt?: string;
  revisionType?: string;
  url: string;
}

/** 조문 본문 한 줄: [조문번호("제3조", "제3조의2", 장·절 제목이면 ""), 조문제목, 본문] */
export type ArticleRow = [string, string, string];
/** 규범 ID → 조문 본문 (data/build/fulltext.json, 조문 내용 검색 시에만 지연 로딩) */
export type FullText = Record<string, ArticleRow[]>;

/** 법규집 본문 블록 — 법규집에만 있는 항목(V~VII)의 본문 (data/build/book-text.json) */
export type BookCell = { x: string; h?: 1; cs?: number; rs?: number };
export type BookBlock =
  | { t: 'h'; lv: number; x: string }
  | { t: 'p'; x: string }
  | { t: 'table'; caption?: string; rows: BookCell[][] }
  | { t: 'img'; src: string; w?: number; h?: number; caption?: string };
export interface BookTextEntry {
  title: string;
  blocks: BookBlock[];
  /** 수집일 YYYY-MM-DD */
  fetchedAt: string;
}
/** 법규집 뷰어 문서 ID → 본문 */
export type BookText = Record<string, BookTextEntry>;
