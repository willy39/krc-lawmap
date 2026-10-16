# P0 API 실측 기록

> 상태: **미실측** — LAW_OC 발급 후 `LAW_OC=... npm run probe` 결과로 이 문서를 채운다.
> 실측 전까지 수집기(`scripts/collect/*`)는 후보 필드명 목록(`pick(obj, [...])`)으로 변이에 대비한다.

## 확인할 항목 (설계서 ⚠️)

| # | 항목 | 현재 가정 | 확인 결과 |
|---|------|-----------|-----------|
| 1 | 조약 target | `trty`, 필드 `조약명`·`조약일련번호`·`발효일자` | |
| 2 | 공공기관 규정 target | `pi` (overrides.yaml `pi_target` 로 변경 가능), 필드 `규정명`/`공공기관규정명`, `기관명` | |
| 3 | 중앙부처 1차 해석 target | `{부처약어}CgmExpc` — probe 후보: mohwCgmExpc / moisCgmExpc / moelCgmExpc → overrides.yaml `cgm_targets` 에 등록 | |
| 4 | 중앙행정기관 결정선례 | Open API 미확인 → 미제공 시 review.yaml 수동 큐레이션 + 딥링크 | |
| 5 | 판례 사람이 읽는 URL | `https://www.law.go.kr/판례/(사건번호)` (헌재결정례·법령해석례·행정심판례 동일 패턴) | |
| 6 | "더 찾기" 검색 딥링크 | `https://www.law.go.kr/LSW/totalSearch.do?query=...` | |
| 7 | 자치법규 동명 충돌 | `https://www.law.go.kr/자치법규/{지자체명 포함 정식명칭}` | |
| 8 | 응답 필드명 | 판례 `사건명·사건번호·선고일자·법원명·판례상세링크`, 해석례 `안건명·안건번호·회신일자·질의기관명` | |
| 9 | 클라우드 IP(GitHub Actions) 호출 가능 여부 | 미확인 — 차단 시 docs/manual-refresh.md | |

## 실측 결과

(probe 출력 표를 붙여 넣는다)
