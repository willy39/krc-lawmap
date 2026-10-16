# P0 API 실측 기록

> 실측일: 2026-10-16 · 인증키(OC): GitHub Secret `LAW_OC` / 로컬 `.env` (저장소에 커밋하지 않음)
> 재실측: `LAW_OC=... npm run probe` → `data/raw/probe/` 에 원응답 저장(OC 마스킹)

## 결론 요약 (설계서 ⚠️ 항목)

| # | 항목 | 실측 결과 | 반영 |
|---|------|-----------|------|
| 1 | 조약 target | `trty` 동작. 필드 `조약명`·`조약일련번호`·`발효일자`·`조약구분명`. '제네바' 26건(정정·선언·개정 문서 포함) | `1949년 8월 12일자`로 시작하고 정정·선언·개정이 아닌 문서만 수집 |
| 2 | 공공기관 규정 target | `pi` 동작. **응답 필드는 행정규칙 형식**(`행정규칙명`·`행정규칙일련번호`·`소관부처명`=기관명·`시행일자`·`발령일자`). '대한적십자사' totalCnt 94 | 같은 규정의 개정본이 '현행'으로 2건씩 오는 경우가 있어 **명칭별 최신 시행본 1건만** 표시 (API 건수와 표시 건수 차이 = 중복 개정본) |
| 3 | 중앙부처 1차 해석 | `mohwCgmExpc`·`moisCgmExpc`·`moelCgmExpc` 모두 동작(응답 정상). 필드 `법령해석일련번호`·`안건명`·`안건번호`·`해석일자`·`해석기관명`·`질의기관명`, 본문 `질의요지`·`회답`·`관련법령` | overrides.yaml `cgm_targets` 등록. 기관명 본문 검색 결과는 현재 거의 0건 |
| 4 | 중앙행정기관 결정선례 | Open API target 미확인 | review.yaml 수동 큐레이션 대상(F-18) |
| 5 | 판례 등 원문 URL | `https://www.law.go.kr/판례/(사건번호)` **동작 안 함**(한글주소 오류 페이지). 일련번호 화면은 동작 | 아래 '원문 링크' 표 형식 사용 |
| 6 | "더 찾기" 검색 딥링크 | `LSW/totalSearch.do` 404 | `LSW/precSc.do?query=` (판례 검색) |
| 7 | 자치법규 한글주소 | 띄어쓰기 없는 정식명은 동작, 띄어쓰기 포함 시 불안정 | 일련번호 화면 `ordinInfoP.do` 사용 |
| 8 | 검색 방식 | 판례·헌재·해석례·행정심판·1차 해석·행정규칙 모두 **제목 검색(search=1)은 거의 0건**, 본문 검색(search=2)으로 후보 수집 | 해석·적용 축과 행정규칙은 `search=2` |
| 9 | 판례 출처 | 본문 검색 결과에 국세법령정보시스템 출처 판례(법원명 공란, 사건번호 `전주지방법원-2017-구합-2476` 형식) 포함 | 원문 링크는 taxlaw.nts.go.kr 로 리다이렉트됨(정상) |
| 10 | 응답 형식 | JSON 루트 `{LawSearch|PrecSearch|…: {totalCnt, page, <목록키>: [...]}}`. 1건일 때 목록이 배열이 아닌 객체 | `asArray` 처리 |
| 11 | 날짜 | `YYYYMMDD` 또는 `YYYY.MM.DD`, 미상은 `0` | `isoDate` 정규화, 미상은 공란 |
| 12 | 네트워크 | `Referer`·브라우저 UA 필수. Node 의 fetch 는 기본적으로 HTTP(S)_PROXY 를 따르지 않으므로 `NODE_USE_ENV_PROXY=1` 로 실행(`npm run data` 에 포함) | |

## 원문 링크 규칙 (확정)

| 대상 | URL |
|------|-----|
| 법령 | `https://www.law.go.kr/법령/{법령명}` (조문: `/법령/{법령명}/제n조`) |
| 행정규칙 | `https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq={행정규칙일련번호}` |
| 자치법규 | `https://www.law.go.kr/LSW/ordinInfoP.do?ordinSeq={자치법규일련번호}` |
| 조약 | `https://www.law.go.kr/LSW/trtyInfoP.do?trtySeq={조약일련번호}` |
| 공공기관 정관·규정 | `https://www.law.go.kr/LSW/schlPubRulInfoP.do?schlPubRulSeq={상세링크 ID}` |
| 판례 | `https://www.law.go.kr/LSW/precInfoP.do?precSeq={판례일련번호}` |
| 헌재결정례 | `https://www.law.go.kr/LSW/detcInfoP.do?detcSeq={헌재결정례일련번호}` |
| 법령해석례 | `https://www.law.go.kr/LSW/expcInfoP.do?expcSeq={법령해석례일련번호}` |
| 행정심판례 | `https://www.law.go.kr/LSW/deccInfoP.do?deccSeq={행정심판재결례일련번호}` |
| 중앙부처 1차 해석 | `https://www.law.go.kr/LSW/cgmExpcInfoR.do?cgmExpcDatSeq={법령해석일련번호}` (스타일 없는 본문 조각 화면) |

## 검색 건수 (2026-10-16, totalCnt)

| target | 질의 | 제목(search=1) | 본문(search=2) |
|--------|------|---:|---:|
| prec | 대한적십자사 / 적십자병원 / 혈액원 / 대한적십자사 조직법 | 0 / 0 / 0 / 0 | 44 / 32 / 23 / 4 |
| detc | 대한적십자사 / 대한적십자사 조직법 | 6 / 6 | 11 / 7 |
| expc | 대한적십자사 / 혈액원 | 2 / 0 | 6 / 2 |
| decc | 대한적십자사 / 적십자병원 | 0 / 0 | 14 / 28 |
| admrul | 대한적십자사 / 혈액원 | 0 / 0 | 33 / 17 |
| ordin | 적십자 / 헌혈 / 재해구호 / 이산가족 | 234 / 255 / 25 / 5 | — |
| pi | 대한적십자사 | 94 | — |
| trty | 제네바 | 26 | — |
