# 대한적십자사 법규 지도 (KRC Law Map) — 시범서비스

공개 주소: https://willy39.github.io/krc-lawmap/ (GitHub Pages) · https://krc-lawmap.vercel.app/ (Vercel)

국가법령정보센터(law.go.kr)에 흩어진 대한적십자사 관련 자료를 두 개의 축으로 정리해 한 화면에서 보고, 클릭 한 번으로 원문에 닿게 하는 **정적 웹서비스**입니다. 설계서: [docs/design.md](docs/design.md)

- **규범 축 (법규 지도)**: 헌법·조약 → 법률·시행령 → 행정규칙 → 자치법규(조례·규칙) → 정관 → 규정 → 시행규칙
- **해석·적용 축 (판례·해석 라이브러리)**: 판례 · 헌재결정례 · 법령해석례 · 중앙부처 1차 해석 · 결정선례 · 행정심판례
- **연결**: 참조조문 파싱(조문 단위) + 담당자 지정으로 규범 ↔ 판례·해석 연결

> 데이터: 법제처 국가법령정보 공동활용 Open API로 수집한 **실제 데이터** (기준일은 화면 헤더·`data/build/meta.json` 참조).
> 판례·해석은 관련성 점수 70점 이상(자동분류) 또는 담당자 승인 항목만 노출되며, 40–69점 후보는 `data/build/review-queue.json` 에서 검수를 기다립니다 → [docs/review-guide.md](docs/review-guide.md)
> 키 없이 화면만 확인하려면 `npm run data:seed` 로 데모 데이터를 빌드할 수 있습니다(‘예시’ 표시).

## 화면

| 경로 | 내용 |
|------|------|
| `/` | 법규 체계도(아이시클: 헌법 띠가 아래로 쪼개지고 칸 폭 = 딸린 규범 수, 칸 선택 시 아래에 규정 목록) + 축별 요약·판례·해석 도서관 + 법규집 + 최근 변경 |
| `/tree` | 트리 목록 (WAI-ARIA tree, 키보드 ↑↓←→ / Enter / o) |
| `/list` | 규범 전체 일람 (URL 동기화 필터, CSV) |
| `/local` | 자치법규 지역뷰 (시·도 타일 그리드, 0건 강조) |
| `/cases`, `/cases/[id]` | 판례·해석 라이브러리 (유형 탭·필터·연도 막대·관련도) / 공유용 상세 |
| `/field/[code]` | 분야 페이지 (규범 + 조례 + 판례·해석) |
| `/changes`, `/about` | 최근 변경 / 출처·기준일·검수 기준·면책 |

공통: 상세 패널(데스크톱 우측/모바일 바텀시트, 조문 본문 탭), ⌘K 통합검색(명칭·**조문 내용**·사건번호·별칭), 사용안내(`/guide`, 헤더 팝업).

> 조문 내용 검색: 법령·기관규정·조례의 조문 본문을 `data/build/fulltext.json`(약 3.3MB, gzip 약 550KB)으로 따로 저장하고, 조문 내용 검색이나 본문 탭을 처음 쓸 때만 내려받습니다. 판례·해석은 설계대로 요지만 저장합니다.

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
주간 수집은 [refresh-data.yml](.github/workflows/refresh-data.yml) (매주 월 06:00 KST) — 저장소 Secret `LAW_OC`(등록됨)로 수집해 결과를 PR로 올립니다. 클라우드 IP가 차단되면 [docs/manual-refresh.md](docs/manual-refresh.md) 절차를 따르세요.

### Vercel — https://krc-lawmap.vercel.app/

루트 경로(`/`)로 빌드됩니다(BASE_PATH 없음). 보안 헤더·캐시는 [vercel.json](vercel.json), 업로드 제외는 [.vercelignore](.vercelignore).

```bash
vercel deploy --prod      # 로컬에서 수동 배포 (프로젝트: hwangdonghwan-7895s-projects/krc-lawmap)
```

### 내부 서버 — https://apps.redcross.or.kr/law/ (WebtoB)

정적 파일만 서비스하므로 JEUS 없이 WebtoB 로 충분합니다. 설정 예시·배포·주간 갱신 절차: **[docs/deploy-webtob.md](docs/deploy-webtob.md)**

```bash
npm run package:internal   # → dist/krc-lawmap-law-YYYYMMDD-<커밋>.zip (+ .sha256), 경로 /law 로 빌드·검증
```
main 이 갱신될 때마다 GitHub Actions **Internal package** 워크플로가 같은 zip 을 아티팩트로 만듭니다.

### 내부 서버 (Docker)

```bash
docker compose up -d --build web                 # http://<서버>:8080
# 데이터 갱신
cp .env.example .env                              # LAW_OC 입력
docker compose --profile data run --rm collector
docker compose up -d --build web
```

- 하위 경로 배포: `BASE_PATH=/lawmap docker compose up -d --build web`
- 포트 변경: `WEB_PORT=80`
- 이미지: `web` = nginx-unprivileged(8080, 보안 헤더·CSP), `collector` = Node 24
- 웹폰트(Pretendard, SIL OFL 1.1)는 `public/fonts/` 에 내장되어 폐쇄망에서도 외부 연결 없이 같은 글꼴로 보입니다.

## 면책

본 서비스는 열람 편의를 위한 시범서비스이며 법적 효력은 국가법령정보센터 원문에 있습니다. 판례·해석은 담당자 검수 또는 자동분류로 선별한 일부이며 전부가 아닙니다. 출처: 법제처 국가법령정보센터.
