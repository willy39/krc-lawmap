// 원문 링크 규칙 (설계서 4.5) — 수집 스크립트와 UI가 공유
// ⚠️ 판례·해석례의 사람이 읽는 URL 형식은 P0 실측으로 확정 (docs/api-probe.md)

const LAW = 'https://www.law.go.kr';
const enc = (s: string) => encodeURIComponent(s.trim());

export const lawUrl = (name: string) => `${LAW}/법령/${enc(name)}`;
export const lawArticleUrl = (name: string, article: string) => `${LAW}/법령/${enc(name)}/${enc(article)}`;
export const admrulUrl = (name: string) => `${LAW}/행정규칙/${enc(name)}`;
export const ordinUrl = (name: string) => `${LAW}/자치법규/${enc(name)}`;

const CASE_PATH: Record<string, string> = {
  prec: '판례',
  detc: '헌재결정례',
  expc: '법령해석례',
  decc: '행정심판례',
};

export function caseUrl(source: string, docNo: string): string | undefined {
  const p = CASE_PATH[source];
  return p && docNo ? `${LAW}/${p}/(${enc(docNo)})` : undefined;
}

/** "law.go.kr에서 더 찾기" — 통합검색 딥링크 */
export function moreSearchUrl(query: string): string {
  return `${LAW}/LSW/totalSearch.do?query=${enc(query)}`;
}

export function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}${path}`;
}
