// 사용안내 본문 — 헤더 팝업(GuideDialog)과 /guide 페이지가 함께 쓴다 (훅 없음)
import Link from 'next/link';

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[12px]">{children}</kbd>;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <h2 id={`${id}-h`} className="mb-2 text-base font-bold">
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export const GUIDE_TOC = [
  ['g-search', '검색창 사용법'],
  ['g-screens', '화면 구성'],
  ['g-tree', '법규 나무·체계트리'],
  ['g-detail', '상세 패널'],
  ['g-cases', '판례·해석 보는 법'],
  ['g-legend', '표시·배지'],
  ['g-data', '자료 출처·갱신'],
] as const;

export function GuideContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-7">
      <nav aria-label="사용안내 목차" className="flex flex-wrap gap-1.5">
        {GUIDE_TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-surface-2">
            {label}
          </a>
        ))}
      </nav>

      <Section id="g-search" title="🔍 검색창 사용법">
        <p>
          화면 오른쪽 위 <b>검색</b> 버튼을 누르거나 키보드에서 <Kbd>⌘</Kbd>+<Kbd>K</Kbd> (Windows: <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>)를 누르면 어느 화면에서나 통합검색이 열립니다.
          법령·기관규정·조례·판례·해석·업무분야를 한 번에 찾아 묶음별로 보여 줍니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-2 py-1.5">이렇게 입력하면</th>
                <th className="px-2 py-1.5">이렇게 찾습니다</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5">
              <tr>
                <td>
                  <code>인사관리</code>, <code>혈액관리법</code>
                </td>
                <td>법령·규정·조례 <b>명칭</b>에 들어간 말 (띄어쓰기는 무시)</td>
              </tr>
              <tr>
                <td>
                  <code>경기도</code>, <code>보건복지부</code>
                </td>
                <td>조례의 지자체명, 법령의 소관부처</td>
              </tr>
              <tr>
                <td>
                  <code>헌혈증서</code>, <code>징계 사유</code>
                </td>
                <td>
                  <b>조문 내용</b> — 법령·기관규정·조례의 조문 본문 속 문구 (두 글자 이상, 띄어쓰기 무관). 결과를 누르면 그 조문으로 이동해 강조합니다
                </td>
              </tr>
              <tr>
                <td>
                  <code>2019헌마1404</code>, <code>20-0118</code>
                </td>
                <td>사건번호·안건번호 — 해당 판례·해석을 맨 위에 보여 줍니다</td>
              </tr>
              <tr>
                <td>
                  <code>손해배상</code>, <code>헌혈자 개인정보</code>
                </td>
                <td>판례·해석의 사건명·안건명과 쟁점태그</td>
              </tr>
              <tr>
                <td>
                  <code>회비</code>, <code>보수</code>
                </td>
                <td>
                  별칭도 함께 찾습니다 (회비 ↔ 적십자회비, 보수 ↔ 임금·급여, 헌혈자 정보 ↔ 개인정보)
                </td>
              </tr>
              <tr>
                <td>
                  <code>혈액사업</code>, <code>재난구호</code>
                </td>
                <td>업무분야 — 분야 페이지로 이동</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> 결과 이동 · <Kbd>Enter</Kbd> 상세 보기 · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> law.go.kr 원문 바로 열기 · <Kbd>Esc</Kbd> 닫기
          </li>
          <li>글자가 조금 틀려도 비슷한 명칭을 찾아 줍니다(두 글자 단위 유사도).</li>
          <li>
            조문 내용 결과는 상위 8건까지 보여 줍니다. 전부 보려면 결과 머리글의 <b>일람에서 모두 보기</b>를 누르거나, <b>일람</b> 화면에서 <b>조문 내용 포함</b>을 켜고 검색하세요.
          </li>
          <li>판례·해석은 사건명·번호·쟁점태그로 찾습니다(판결문 전문은 저장하지 않습니다).</li>
        </ul>
      </Section>

      <Section id="g-screens" title="🗂 화면 구성">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>법규 나무</b> — 한눈에 보는 조감도와 대한적십자사 법규집(법령·정관·운영규정·시행규칙, 법규집 편제 순서), 최근 변경
          </li>
          <li>
            <b>체계트리</b> — 헌법·조약 → 법률 → 정관 → 운영규정 → 시행규칙의 상하 관계를 펼쳐 봅니다
          </li>
          <li>
            <b>일람</b> — 모든 규범을 표로 보고 구분·분야·명칭으로 거릅니다. <b>조문 내용 포함</b>을 켜면 본문 문구로도 찾습니다. 걸러진 결과는 <b>CSV 다운로드</b>
          </li>
          <li>
            <b>조례</b> — 시·도 타일을 눌러 지역별 적십자 지원·헌혈 조례를 봅니다. ‘조례 없는 시·도 강조’로 지역 비교
          </li>
          <li>
            <b>판례·해석</b> — 판례·헌재·법령해석례·1차 해석·결정선례·행정심판을 유형 탭과 필터로 봅니다
          </li>
          <li>
            <b>최근 변경</b> — 직전 수집 대비 추가·개정·폐지된 규범과 새로 들어온 판례·해석
          </li>
        </ul>
        <p className="text-muted">필터를 바꾸면 주소(URL)에 반영되므로, 그 주소를 복사해 같은 화면을 공유할 수 있습니다.</p>
      </Section>

      <Section id="g-tree" title="🌳 법규 나무·체계트리">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>법령 표지판</b>을 누르면 상세 패널, 이름 옆 <b>↗</b>를 누르면 law.go.kr 원문이 새 탭으로 열립니다.
          </li>
          <li>
            <b>열매</b>는 분야별 기관규정 묶음이며 숫자는 건수입니다. 누르면 체계트리의 해당 묶음으로 이동합니다.
          </li>
          <li>
            <b>점선 곁가지</b>는 자치법규(조례)입니다. 누르면 조례 지역뷰로 이동합니다.
          </li>
          <li>가지가 굵을수록 그 아래에 딸린 규범이 많습니다.</li>
          <li>
            체계트리 키보드: <Kbd>↑</Kbd> <Kbd>↓</Kbd> 이동 · <Kbd>→</Kbd> 펼치기 · <Kbd>←</Kbd> 접기 · <Kbd>Enter</Kbd> 상세 · <Kbd>o</Kbd> 원문
          </li>
        </ul>
      </Section>

      <Section id="g-detail" title="📄 상세 패널">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>개요</b>: 구분·소관·공포/시행일·상위 근거·하위 규범 · <b>조문 목차</b>(법령): 조문별 원문 링크와 그 조문을 인용한 판례 수
          </li>
          <li>
            <b>관련 판례·해석 ⚖</b>: 이 규범을 인용하거나 다룬 자료. 조문을 고르면 그 조문을 인용한 자료만 보입니다.
          </li>
          <li>
            <b>조문 본문</b>: 법령·기관규정·조례의 전체 조문. 위쪽 입력칸에서 이 규범 안의 문구를 찾고 <Kbd>Enter</Kbd>/<Kbd>↑</Kbd><Kbd>↓</Kbd>로 일치 조문을 오갑니다.
          </li>
          <li>
            <b>원문 보기 ↗</b>(law.go.kr) · <b>링크 복사</b> · <b>트리에서 위치 보기</b> · <Kbd>Esc</Kbd> 닫기
          </li>
        </ul>
      </Section>

      <Section id="g-cases" title="⚖ 판례·해석 보는 법">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            판례·해석에는 ‘대한적십자사 소관’ 구분이 없어서 <b>관련도 점수</b>로 고릅니다. 대한적십자사가 당사자·질의기관이거나, 조직법을 인용하거나, 국제인도법을 다룬 자료가 높게 매겨집니다.
          </li>
          <li>
            <b>자동분류</b> 표시는 점수로 자동 선별되어 담당자 검수 전인 자료입니다. ‘자동분류 포함’을 끄면 검수 승인 자료만 봅니다.
          </li>
          <li>관련도 ●●●○ 는 점수를 4단계로 보여 줍니다. 정렬을 ‘관련도순’으로 바꿀 수 있습니다.</li>
          <li>연도 막대를 누르면 그 해 자료만 보입니다. 요지는 원문 일부이며, 판례 변경 여부는 원문에서 확인하세요.</li>
        </ul>
      </Section>

      <Section id="g-legend" title="🏷 표시·배지">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          <li>📜 법령계열 — 헌법·조약·법률·시행령·행정규칙</li>
          <li>🗺 자치법규계열 — 조례·자치규칙</li>
          <li>📁 기관규정계열 — 정관·운영규정·시행규칙·지침</li>
          <li>⚖ 해석·적용계열 — 판례·헌재·해석례 등</li>
          <li>
            <span className="rounded bg-accent/10 px-1.5 text-xs font-semibold text-accent">최근 개정</span> 최근 90일 안에 시행
          </li>
          <li>
            <span className="rounded bg-law-bg px-1.5 text-xs font-semibold text-law">시행 예정</span> 앞으로 시행될 개정
          </li>
          <li>
            <span className="rounded-full border border-case/40 bg-case-bg px-1.5 text-xs font-semibold text-case">⚖ 3</span> 연결된 판례·해석 수 (누르면 목록)
          </li>
          <li>
            <span className="rounded bg-surface-2 px-1.5 text-xs text-muted">자동분류</span> 담당자 검수 전 자료
          </li>
        </ul>
      </Section>

      <Section id="g-data" title="🗄 자료 출처·갱신">
        <ul className="list-disc space-y-1 pl-5">
          <li>법제처 국가법령정보센터 공동활용 Open API로 매주 월요일 수집하며, 화면 위쪽 <b>기준일</b>이 마지막 수집일입니다.</li>
          <li>정관·운영규정·시행규칙의 순서는 대한적십자사 법규집 편제를 따르고, 내용·시행일은 국가법령정보센터 수집본입니다.</li>
          <li>본 서비스는 열람 편의를 위한 시범서비스이며 법적 효력은 국가법령정보센터 원문에 있습니다.</li>
        </ul>
        <p>
          <Link href="/about/" onClick={onNavigate} className="underline">
            서비스 안내·검수 기준 자세히 보기 →
          </Link>
        </p>
      </Section>
    </div>
  );
}
