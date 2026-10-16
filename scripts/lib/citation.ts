// 참조조문 파서 (설계서 3.6, 12장)
// 입력 예: "구 혈액관리법(2012. 2. 1. 법률 제11264호로 개정되기 전의 것) 제12조 제1항, 같은 법 시행령 제3조"
// 출력: [{ lawName: '혈액관리법', article: '제12조' }, { lawName: '혈액관리법 시행령', article: '제3조' }]

export interface Citation {
  lawName: string;
  article?: string;
}

const LAW_SUFFIX = /(법률|법|령|규칙|규정|조례|헌법|협약|의정서|정관)$/;
const SAME_LAW = /^(같은\s*법|동법|같은\s*법률)\s*/;
const SUBORDINATE = /^(시행령|시행규칙)$/;

/** 법령명 비교용 정규화: 공백·「」·가운뎃점 제거 */
export function normalizeLawName(name: string): string {
  return name.replace(/[\s「」『』·ㆍ]/g, '');
}

function cleanLawName(raw: string): string {
  return raw
    .replace(/[「」『』]/g, '')
    .replace(/^\s*\[\d+\]\s*/, '')
    .replace(/^(구|舊)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseLawName(name: string): string {
  return name.replace(/\s*(시행령|시행규칙)$/, '');
}

export function parseCitations(input: string | undefined | null): Citation[] {
  if (!input) return [];
  let text = String(input)
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\d+\]/g, ' / ')
    // 괄호 속 개정 연혁 등 제거 (중첩 1단계까지)
    .replace(/\([^()]*\([^()]*\)[^()]*\)/g, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/제\s*(\d+)\s*조\s*의\s*(\d+)/g, '제$1조의$2')
    .replace(/제\s*(\d+)\s*조/g, '제$1조');

  // 조문 나열의 가운뎃점·'및'·'또는'·'내지' 는 쉼표로 취급 (법령명 속 '및'은 보존)
  text = text.replace(/\s*(?:[·ㆍ]|\s및\s|\s또는\s|\s내지\s|~)\s*(?=제\d)/g, ', ');

  const segments = text.split(/[,/;\n]+/).map((s) => s.trim()).filter(Boolean);
  const out: Citation[] = [];
  let lastLaw: string | null = null;

  const resolve = (prefix: string): string | null | undefined => {
    // undefined = 법령 아님(건너뜀), null = 직전 법령 유지
    if (!prefix) return null;
    if (SAME_LAW.test(prefix)) {
      const rest = prefix.replace(SAME_LAW, '').trim();
      if (!lastLaw) return undefined;
      return SUBORDINATE.test(rest) ? `${baseLawName(lastLaw)} ${rest}` : lastLaw;
    }
    if (SUBORDINATE.test(prefix) && lastLaw) return `${baseLawName(lastLaw)} ${prefix}`;
    if (/^같은\s*조/.test(prefix)) return undefined;
    if (LAW_SUFFIX.test(prefix)) return prefix;
    return undefined;
  };
  const push = (lawName: string, article?: string) => {
    if (!out.some((c) => c.lawName === lawName && c.article === article)) out.push(article ? { lawName, article } : { lawName });
  };

  for (const seg of segments) {
    // 한 구간에 "법령A 제n조 … 법령B 제m조"가 붙어 오는 경우(헌재 참조조문 등)를 위해 조문 단위로 끊어 읽는다
    const parts = seg.split(/(제\d+조(?:의\d+)?)/);
    if (parts.length === 1) {
      const name = resolve(cleanLawName(seg).replace(/^(제\d+(항|호)\s*)+/, ''));
      if (name) {
        lastLaw = name;
        push(name);
      }
      continue;
    }
    for (let k = 0; k + 1 < parts.length; k += 2) {
      // 조문 사이 텍스트에서 앞쪽 항·호 표기를 걷어내면 남는 것이 다음 법령명
      const between = cleanLawName(parts[k].replace(/^\s*(제\d+(항|호)(의\d+)?\s*)+/, '').replace(/^(구|舊)\s*/, ''));
      const name = resolve(between);
      if (name === undefined && between) {
        if (/^(제\d+(항|호)|같은\s*조)/.test(between) && lastLaw) {
          /* 같은 법 계속 */
        } else continue;
      }
      if (name) lastLaw = name;
      if (!lastLaw) continue;
      push(lastLaw, parts[k + 1]);
    }
    if (parts.length % 2 === 1) {
      const tail = cleanLawName(parts[parts.length - 1].replace(/^\s*(제\d+(항|호)(의\d+)?\s*)+/, '').replace(/^(구|舊)\s*/, ''));
      const name = tail ? resolve(tail) : null;
      if (name) {
        lastLaw = name;
        push(name);
      }
    }
  }
  // 조문 없는 항목이 같은 법의 조문 항목과 겹치면 제거
  return out.filter((c) => c.article || !out.some((o) => o !== c && o.lawName === c.lawName && o.article));
}

/** 조례 제1조(목적)에서 「」 인용된 상위 법령명 추출 */
export function parsePurposeParents(purpose: string | undefined | null): string[] {
  if (!purpose) return [];
  const names = [...String(purpose).matchAll(/「([^」]+)」/g)].map((m) => cleanLawName(m[1]));
  return [...new Set(names)];
}
