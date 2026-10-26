# KRC Law Map(대한적십자사 법규 지도) — 작업 규칙
- 설계 기준: docs/design.md. 명세와 다르게 구현해야 하면 먼저 이유를 설명하고 확인받을 것.
- 법령·판례 데이터는 런타임에 API를 호출하지 않는다(v1). scripts/에서 빌드타임에만 수집한다.
- LAW_OC 키를 코드·로그·산출물·URL에 남기지 않는다.
- 법령명·사건번호·날짜를 추측해 하드코딩하지 않는다. 데이터에 없으면 비우고 플래그를 단다.
  (예외: data/seed/ 의 데모 데이터는 `demo: true` + "예시" 표시로만 사용한다.)
- API 빈 응답·HTML 응답을 "자료 없음"으로 확정하지 않는다. 재시도 후에도 실패하면 이전 스냅샷을 유지한다.
- 판례·해석은 요지(≤600자)와 메타데이터만 저장한다. 전문은 원문 링크로 보낸다.
- 법령·기관규정·조례의 조문 본문은 조문 내용 검색용으로 data/build/fulltext.json 에 따로 저장한다(2026-10-21 승인). norms.json 에 넣지 않고 지연 로딩한다.
- review.yaml에서 rejected인 항목은 어떤 경우에도 노출하지 않는다.
- 원문 링크는 data/build의 url 필드만 사용한다.
- 커밋 전: npm run lint && npm test && npm run build
- UI 문구는 한국어, 날짜 표기 YYYY. M. D.

## 명령
- `npm run data:seed` — 데모 데이터로 data/build 생성 (키 불필요)
- `npm run data` — 법제처 Open API 수집 (LAW_OC 필요), `-- --check-links` 로 링크 검사
- `npm run probe` — P0 API 실측
- `node --import tsx scripts/book-laws.ts` — 법규집 'VI. 유관법령조문'과 연계할 최신 법령(overrides.yaml `book_laws`)만 갱신 (`npm run data` 에도 포함)
- `npm run build` — 정적 export(out/). GitHub Pages는 `NEXT_PUBLIC_BASE_PATH=/<repo>`
- 번들러는 webpack(`--webpack`) 사용: Turbopack CSS 워커는 샌드박스 환경에서 포트 바인딩에 실패한다.
