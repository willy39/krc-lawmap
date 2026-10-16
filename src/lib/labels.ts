import type { CaseSource, FieldCode, Level, NormItem, OrdinanceBundle } from '@/types/model';

export const FIELD_NAMES: Record<FieldCode, string> = {
  ORG: '조직·운영·기구', HR: '인사·복무·교육', PAY: '보수·복리후생', FIN: '재무·회계·계약·회비',
  AUD: '감사·윤리·청렴', BLD: '혈액사업', MED: '의료사업', DIS: '재난구호·안전',
  VOL: '봉사·회원·청소년', INT: '국제·인도법·남북', INF: '정보·개인정보', ETC: '기타',
};

export const CASE_LABELS: Record<CaseSource, { name: string; short: string; icon: string }> = {
  prec: { name: '판례', short: '판례', icon: '⚖' },
  detc: { name: '헌재결정례', short: '헌재', icon: '🏛' },
  expc: { name: '법령해석례', short: '해석례', icon: '📘' },
  cgm: { name: '중앙부처 1차 해석', short: '1차 해석', icon: '📗' },
  pre: { name: '중앙행정기관 결정선례', short: '결정선례', icon: '📙' },
  decc: { name: '행정심판례', short: '행정심판', icon: '📕' },
};

export const LEVEL_NAMES: Record<Level, string> = {
  L0_CONSTITUTION: '헌법', L0_TREATY: '조약', L1_ACT: '근거 법률', L2_DECREE: '하위 법령',
  L1R_RELATED: '관련 법령', L1A_ADMRULE: '행정규칙', LO_ORDINANCE: '조례', LO_ORD_RULE: '자치 규칙',
  L3_ARTICLES: '정관', L4_REGULATION: '규정', L5_RULE: '시행규칙·세칙', L6_GUIDELINE: '지침·요령',
};

export const BUNDLE_NAMES: Record<OrdinanceBundle, string> = {
  redcross: '적십자 지원', blood: '헌혈', disaster: '재난구호', family: '이산가족', etc: '기타',
};

/** 4계열 범례 (설계서 7.10) */
export type Family = 'law' | 'local' | 'inst' | 'case';
export const FAMILY: Record<Family, { name: string; icon: string }> = {
  law: { name: '법령계열', icon: '📜' },
  local: { name: '자치법규계열', icon: '🗺' },
  inst: { name: '기관규정계열', icon: '📁' },
  case: { name: '해석·적용계열', icon: '⚖' },
};

export function familyOf(n: Pick<NormItem, 'source'>): Family {
  if (n.source === 'ordin') return 'local';
  if (n.source === 'pi') return 'inst';
  return 'law';
}

export const SOURCE_GROUP_NAMES: Record<string, string> = {
  law: '법령', admrul: '행정규칙', ordin: '자치법규', pi: '기관규정', trty: '조약', eflaw: '시행예정 법령',
};
