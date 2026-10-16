// 원문 링크 규칙 (설계서 4.5) — 수집 스크립트와 UI가 공유
// ⚠️ 판례·해석례의 사람이 읽는 URL 형식은 P0 실측으로 확정 (docs/api-probe.md)

const LAW = 'https://www.law.go.kr';
const enc = (s: string) => encodeURIComponent(s.trim());

export const lawUrl = (name: string) => `${LAW}/법령/${enc(name)}`;
export const lawArticleUrl = (name: string, article: string) => `${LAW}/법령/${enc(name)}/${enc(article)}`;
export const admrulUrl = (name: string) => `${LAW}/행정규칙/${enc(name)}`;
export const ordinUrl = (name: string) => `${LAW}/자치법규/${enc(name)}`;

// 일련번호 기반 상세 화면 (P0 실측: 판례 등은 '사건번호' 한글주소가 동작하지 않아 일련번호 화면을 쓴다)
const seqUrl = (page: string, param: string) => (seq: string) => `${LAW}/LSW/${page}?${param}=${enc(seq)}`;
export const admrulSeqUrl = seqUrl('admRulInfoP.do', 'admRulSeq');
export const ordinSeqUrl = seqUrl('ordinInfoP.do', 'ordinSeq');
export const trtySeqUrl = seqUrl('trtyInfoP.do', 'trtySeq');
export const piSeqUrl = seqUrl('schlPubRulInfoP.do', 'schlPubRulSeq');

const CASE_SEQ: Partial<Record<string, (seq: string) => string>> = {
  prec: seqUrl('precInfoP.do', 'precSeq'),
  detc: seqUrl('detcInfoP.do', 'detcSeq'),
  expc: seqUrl('expcInfoP.do', 'expcSeq'),
  decc: seqUrl('deccInfoP.do', 'deccSeq'),
  cgm: seqUrl('cgmExpcInfoR.do', 'cgmExpcDatSeq'),
};

export function caseUrl(source: string, seq: string): string | undefined {
  const f = CASE_SEQ[source];
  return f && seq ? f(seq) : undefined;
}

/** "law.go.kr에서 더 찾기" — 판례 검색 화면 딥링크 */
export function moreSearchUrl(query: string): string {
  return `${LAW}/LSW/precSc.do?query=${enc(query)}`;
}

export function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}${path}`;
}
