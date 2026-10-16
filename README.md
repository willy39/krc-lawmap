# 대한적십자사 법규 나무 (KRC Law Tree) — 시범서비스

국가법령정보센터(law.go.kr)에 흩어진 대한적십자사 관련 자료를 두 개의 축으로 정리해 한 화면에서 보고, 클릭 한 번으로 원문에 닿게 하는 **정적 웹서비스**입니다. 설계서: [docs/design.md](docs/design.md)

- **규범 축 (법규 나무)**: 헌법·조약 → 법률·시행령 → 행정규칙 → 자치법규(조례·규칙) → 정관 → 규정 → 시행규칙
- **해석·적용 축 (판례·해석 라이브러리)**: 판례 · 헌재결정례 · 법령해석례 · 중앙부처 1차 해석 · 결정선례 · 행정심판례
- **연결**: 참조조문 파싱(조문 단위) + 담당자 지정으로 규범 ↔ 판례·해석 연결

> ⚠️ 현재 저장소의 `data/build` 는 **데모(시드) 데이터**입니다. ‘예시’ 표시 항목의 명칭·일자·사건번호는 실제가 아닙니다. 법제처 Open API 인증키(OC)를 발급받아 `npm run data` 를 실행하면 실제 데이터로 바뀝니다.

## 화면

| 경로 | 내용 |
|------|------|
| `/` | 법규 나무 조감도(⚖ 배지·자치법규 곁가지) + 판례·해석 도서관 카드 + 축별 요약 + 최근 변경 |
| `/tree` | 체계트리 (WAI-ARIA tree, 키보드 ↑↓←→ / Enter / o) |
| `/list` | 규범 전체 일람 (URL 동기화 필터, CSV) |
| `/local` | 자치법규 지역뷰 (시·도 타일 그리드, 0건 강조) |
| `/cases`, `/cases/[id]` | 판례·해석 라이브러리 (유형 탭·필터·연도 막대·관련도) / 공유용 상세 |
| `/field/[code]` | 분야 페이지 (규범 + 조례 + 판례·해석) |
| `/changes`, `/about` | 최근 변경 / 출처·기준일·검수 기준·면책 |

공통: 상세 패널(데스크톱 우측/모바일 바텀시트), ⌘K 통합검색(사건번호 인식·별칭 사전).

## 구조

```
scripts/            빌드타임 수집 파이프라인 (런타임 API 호출 없음)
  lib/lawApi.ts     Referer/UA 주입 · 루트 검증 · 지수 백오프 재시도 · 동시성 2 · OC 마스킹
  lib/citation.ts   참조조문 파서 (「」, 같은 법, 가운뎃점, 조의2 …)
  collect/          norms(law·eflaw·admrul·ordin·trty·pi) · cases(prec·detc·expc·cgm·decc)
  classify · normalize · score · relate · validate · build-data
data/               사람이 편집: overrides / review / relevance / taxonomy / regions .yaml
  seed/             데모 데이터 · build/ 산출물(JSON)
src/                Next.js(static export) + Tailwind + d3-hierarchy
```

## 개발

```bash
npm ci
npm run data:seed     # 데모 데이터로 data/build 생성
npm run dev           # http://localhost:3000
npm run lint && npm test && npm run build   # out/ 정적 산출물
```

실제 데이터 수집:

```bash
cp .env.example .env  # LAW_OC=<법제처 Open API 인증키>
set -a; . ./.env; set +a
npm run probe         # P0 실측 → docs/api-probe.md
npm run data -- --check-links
```

## 배포

### GitHub Pages
`main` 에 push 하면 [.github/workflows/pages.yml](.github/workflows/pages.yml) 이 `NEXT_PUBLIC_BASE_PATH=/<저장소명>` 으로 빌드해 배포합니다.
주간 수집은 [refresh-data.yml](.github/workflows/refresh-data.yml) (매주 월 06:00 KST) — 저장소 Secret `LAW_OC` 설정 시 동작하며, 결과를 PR로 올립니다.

### 내부 서버 (Docker)

```bash
docker compose up -d --build web                 # http://<서버>:8080
# 데이터 갱신
cp .env.example .env                              # LAW_OC 입력
docker compose --profile data run --rm collector
docker compose up -d --build web
```

- 하위 경로 배포: `BASE_PATH=/lawtree docker compose up -d --build web`
- 포트 변경: `WEB_PORT=80`
- 이미지: `web` = nginx-unprivileged(8080, 보안 헤더·CSP), `collector` = Node 24
- 폐쇄망: 웹폰트(Pretendard CDN)가 차단되면 시스템 폰트로 대체됩니다.

## 면책

본 서비스는 열람 편의를 위한 시범서비스이며 법적 효력은 국가법령정보센터 원문에 있습니다. 판례·해석은 담당자 검수 또는 자동분류로 선별한 일부이며 전부가 아닙니다. 출처: 법제처 국가법령정보센터.
