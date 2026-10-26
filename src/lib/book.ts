// 대한적십자사 법규집 편제(I 법령 ~ VII 폐지규정) 구성 — 홈 하단과 /book 페이지가 함께 쓴다 (서버 전용)
import 'server-only';
import type { NormItem } from '@/types/model';
import type { BookGroup } from '@/components/common/RegulationBook';
import { getBookLaws, getNorms, getOfficialOrder } from './data';

/**
 * 법규집 7개 편을 법규집과 같은 순번(편마다 1부터)으로.
 * I~IV 는 law.go.kr 수집본과 명칭으로 연결, V~VII 은 법규집에만 있는 항목이라 법규집 뷰어로 연결한다.
 * 법규집에 없는 수집본은 넣지 않는다.
 */
export function getBook(): { groups: BookGroup[]; source: string; checkedAt: string } {
  const norms = getNorms();
  const order = getOfficialOrder();
  const key = (t: string) => t.replace(/\s/g, '');
  const alias = (t: string) => order.aliases[t] ?? t;
  const pis = norms.filter((n) => n.source === 'pi');
  const used = new Set<string>();
  const find = (title: string, pool: NormItem[]) => {
    const n = pool.find((x) => !used.has(x.id) && key(alias(x.title)) === key(title));
    if (n) used.add(n.id);
    return n;
  };
  const shorten = (t: string) => t.replace(/^대한적십자사\s+(?!조직법)/, '');
  const pools: Record<string, NormItem[]> = {
    법령: norms.filter((n) => n.level === 'L1_ACT' || n.level === 'L2_DECREE'),
    정관: pis,
    운영규정: pis,
    시행규칙: pis,
  };
  // 법규집 수록일 '2021.5.18., 일부개정' → '2021-05-18'
  const noteDate = (note?: string) => {
    const m = note?.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : undefined;
  };
  const bookLaws = getBookLaws();
  const groups: BookGroup[] = order.parts.map((part) => ({
    no: part.no,
    title: part.title,
    items: part.items.map((e, i) => {
      const english = /^[A-Z]/.test(e.title);
      const pool = pools[part.title];
      const n = pool && !english ? find(e.title, pool) : undefined;
      // 유관법령: 법규집 수록본과 최신 법령을 함께 (법규집보다 뒤에 공포된 개정이 있으면 표시)
      const law = !pool ? bookLaws.find((l) => key(l.name) === key(e.title)) : undefined;
      const latest = law && { ...law, newer: !!(law.promulgatedAt && noteDate(e.note) && law.promulgatedAt > noteDate(e.note)!) };
      return { no: i + 1, label: english ? e.title : shorten(n?.title ?? e.title), norm: n, english, krcUrl: e.url, note: e.note, krcOnly: !pool, latest };
    }),
  }));
  return { groups, source: order.source, checkedAt: order.checkedAt };
}
