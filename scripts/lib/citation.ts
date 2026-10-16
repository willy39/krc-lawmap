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

  for (const seg of segments) {
    const m = seg.match(/^(.*?)\s*(제\d+조(?:의\d+)?)/);
    let prefix = m ? m[1] : seg;
    const article = m ? m[2] : undefined;
    prefix = cleanLawName(prefix);

    let lawName: string | null = null;
    if (!prefix) {
      lawName = lastLaw;
    } else if (SAME_LAW.test(prefix)) {
      const rest = prefix.replace(SAME_LAW, '').trim();
      if (!lastLaw) continue;
      lawName = SUBORDINATE.test(rest) ? `${baseLawName(lastLaw)} ${rest}` : lastLaw;
    } else if (SUBORDINATE.test(prefix) && lastLaw) {
      lawName = `${baseLawName(lastLaw)} ${prefix}`;
    } else if (/^같은\s*조/.test(prefix) || /^제\d+(항|호)/.test(prefix)) {
      continue;
    } else if (LAW_SUFFIX.test(prefix)) {
      lawName = prefix;
    } else {
      continue;
    }
    if (!lawName) continue;
    lastLaw = lawName;
    const dup = out.some((c) => c.lawName === lawName && c.article === article);
    if (!dup) out.push(article ? { lawName, article } : { lawName });
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
