import type { Metadata } from 'next';
import { getMeta } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { CASE_LABELS, SOURCE_GROUP_NAMES } from '@/lib/labels';
import { CASE_SOURCES, NORM_SOURCES } from '@/types/model';

export const metadata: Metadata = { title: '서비스 안내' };

export default function AboutPage() {
  const m = getMeta();
  return (
    <div className="mx-auto max-w-3xl space-y-8 leading-relaxed">
      <section>
        <h1 className="mb-2 text-2xl font-bold">서비스 안내</h1>
        <p>
          국가법령정보센터(law.go.kr)에 흩어진 대한적십자사 관련 자료를 <strong>규범 축</strong>(헌법·조약 → 법률·시행령 → 행정규칙 → 자치법규 → 정관 → 규정 → 시행규칙)과{' '}
          <strong>해석·적용 축</strong>(판례·헌재결정례·법령해석례·중앙부처 1차 해석·결정선례·행정심판례)으로 정리해 한 화면에서 보고, 클릭 한 번으로 원문에 닿게 하는 정적 웹서비스입니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold">기준일·건수</h2>
        <dl className="tnum grid grid-cols-[10rem_1fr] gap-y-1 text-sm">
          <dt className="text-muted">기준일</dt>
          <dd>{fmtDate(m.baseDate)}</dd>
          <dt className="text-muted">데이터 모드</dt>
          <dd>{m.mode === 'seed' ? '데모(시드) 데이터' : '법제처 Open API 수집'}</dd>
          {NORM_SOURCES.filter((s) => m.counts.norms[s]).map((s) => (
            <div key={s} className="contents">
              <dt className="text-muted">{SOURCE_GROUP_NAMES[s]}</dt>
              <dd>{m.counts.norms[s]}건</dd>
            </div>
          ))}
          {CASE_SOURCES.filter((s) => m.counts.cases[s]).map((s) => (
            <div key={s} className="contents">
              <dt className="text-muted">{CASE_LABELS[s].name}</dt>
              <dd>{m.counts.cases[s]}건</dd>
            </div>
          ))}
          <dt className="text-muted">검수 대기(비노출)</dt>
          <dd>{m.counts.cases.candidate}건</dd>
          {m.apiTotalCnt.pi !== null && (
            <>
              <dt className="text-muted">기관규정 API 총건수</dt>
              <dd>{m.apiTotalCnt.pi}건 (같은 규정의 개정본 중복 포함 · 명칭별 최신 시행본 {m.counts.norms.pi}건 표시)</dd>
            </>
          )}
        </dl>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold">판례·해석 선별 기준</h2>
        <p className="mb-2 text-sm">
          판례·해석에는 ‘대한적십자사 소관’ 필터가 없으므로 <strong>검색 → 관련성 점수 → 담당자 검수</strong> 3단계로 선별합니다.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>참조조문에 대한적십자사 조직법·시행령 포함 +50 / 사건명·안건명에 기관명 +40 / 당사자·질의기관이 대한적십자사 +40 / 큐레이션 관련 법률 인용 +25 / 본문에만 기관명 등장 +10 (상한 100)</li>
          <li>70점 이상은 ‘자동분류’ 표시와 함께 노출, 40–69점은 검수 대기(비노출), 담당자가 승인한 자료는 노출, 제외한 자료는 어떤 경우에도 비노출</li>
          <li>요지는 600자 이내로 발췌하며 전문은 원문 링크로 연결합니다.</li>
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold">면책</h2>
        <p className="text-sm">
          본 서비스는 열람 편의를 위한 시범서비스이며 법적 효력은 국가법령정보센터 원문에 있습니다. 판례·해석은 담당자 검수 또는 자동분류로 선별한 일부이며 전부가 아닙니다. 법률 해석·자문을 제공하지 않습니다. 이용자 정보는 수집하지 않습니다.
        </p>
        <p className="mt-2 text-sm">출처: 법제처 국가법령정보센터 · 국가법령정보 공동활용 Open API</p>
      </section>
    </div>
  );
}
