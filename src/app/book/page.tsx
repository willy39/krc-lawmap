import type { Metadata } from 'next';
import { getBook } from '@/lib/book';
import { fmtDate } from '@/lib/format';
import { RegulationBook } from '@/components/common/RegulationBook';

export const metadata: Metadata = {
  title: '법규집',
  description: '대한적십자사 법규집 편제(법령·정관·운영규정·시행규칙·기타규칙·유관법령조문·폐지규정)를 법규집과 같은 순서·순번으로',
};

export default function BookPage() {
  const book = getBook();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">대한적십자사 법규집</h1>
        <p className="text-sm text-muted">
          대한적십자사 법규집과 같은 편제·순번입니다. 항목을 누르면 본문을 팝업으로 읽을 수 있고(조문 목차·본문 찾기·← → 로 이전/다음 규정), ‘원문↗’은 국가법령정보센터 원문입니다. ({fmtDate(book.checkedAt)} 기준)
        </p>
      </div>
      <nav aria-label="법규집 편 바로가기" className="flex flex-wrap gap-1.5">
        {book.groups.map((g) => (
          <a key={g.no} href={`#book-${g.no}`} className="rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-text">
            <span className="text-muted">{g.no}.</span> {g.title} <span className="tnum text-xs text-muted">{g.items.length}</span>
          </a>
        ))}
      </nav>
      <RegulationBook {...book} />
    </div>
  );
}
