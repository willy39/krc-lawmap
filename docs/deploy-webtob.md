# 내부 서버 배포·갱신 절차 — https://apps.redcross.or.kr/law/ (WebtoB)

> 대상: 내부 서버 운영 담당자, 서비스 담당자
> 작성: 2026-10-26 · 대상 버전: 대한적십자사 법규 지도(KRC Law Map)
> ⚠️ 이 문서의 WebtoB 설정은 **예시**다. 절(`*ALIAS`, `*URI`, `*EXT` 등)·키워드 이름은 사용 중인 WebtoB 버전 매뉴얼과 현재 `http.m` 의 관례를 따라 맞춘다.

---

## 1. 한눈에 보기

```
[외부: 수집·빌드]                                  [내부망: apps.redcross.or.kr]
 법제처 Open API ─ GitHub Actions(주 1회 수집 PR)        WebtoB
                     └ main 머지 → "Internal package"   └ /law/ → /webapps/law/current/ (정적 파일)
                        아티팩트 zip ── 반입 절차 ──▶        (JEUS 사용 안 함)
```

| 항목 | 결정 |
|------|------|
| 서비스 주소 | `https://apps.redcross.or.kr/law/` |
| 서버 구성 | **WebtoB 정적 파일 서비스만** 사용. JEUS·DB·세션·런타임 API 호출 없음 |
| 산출물 | `krc-lawmap-law-YYYYMMDD-<커밋>.zip` + `.sha256` (빌드 경로 `/law` 고정) |
| 서버에 두는 비밀값 | **없음** (법제처 인증키 LAW_OC 는 GitHub Secret 에만 있음) |
| 외부 의존 | 화면 자체는 없음(웹폰트 내장). 단, 항목의 **원문↗ 링크**는 law.go.kr·law.redcross.or.kr 로 나가므로 이용자 PC 에서 해당 사이트 접속이 되어야 열린다 |
| 갱신 주기 | 주 1회(월 06:00 KST 자동 수집 → 검수·머지 → 패키지 반입) |

---

## 2. 산출물 구성

zip 을 풀면 아래 구조가 그대로 `/law/` 아래에 놓인다(zip 최상위 = `/law/` 폴더의 내용).

```
index.html               첫 화면(법규 체계도)
404.html                 없는 주소 안내
VERSION.txt              배포 버전 확인용 (데이터 기준일·커밋·빌드 시각)
book/ tree/ list/ local/ cases/ field/ changes/ guide/ about/   각 화면 (폴더마다 index.html, index.txt)
cases/<id>/              판례·해석 상세 (공유용 주소)
_next/static/            JS·CSS (파일명에 해시 → 오래 캐시해도 됨)
fonts/pretendard/        내장 웹폰트 (Pretendard, SIL OFL 1.1)
data/                    norms.json · cases.json · fulltext.json(조문 본문, 약 3.3MB) 등
```

- 크기: zip 약 12MB, 압축 해제 약 100MB, 파일 약 490개 (데이터 양에 따라 변동)
- 모든 내부 경로는 `/law/` 로 시작하도록 빌드되어 있다. **다른 경로에 풀면 화면이 깨진다**(→ 8장).
- `VERSION.txt` 예:
  ```
  service=대한적십자사 법규 지도 (KRC Law Map)
  base_path=/law/
  data_base_date=2026-10-26
  built_at=2026-10-26T04:21:33Z
  commit=63258e2
  ```

---

## 3. 최초 1회 준비

### 3.1 서버 폴더

릴리스별 폴더 + `current` 심볼릭 링크로 두면 교체·롤백이 한 줄로 끝난다.

```bash
# WebtoB 실행 계정이 읽을 수 있는 위치 (예시 경로)
mkdir -p /webapps/law/releases
# 배포 후: /webapps/law/current -> /webapps/law/releases/20261026-63258e2
```

> 심볼릭 링크를 따라가지 않도록 설정된 환경이면 `current` 를 실제 폴더로 두고 `mv` 로 교체한다(4.3 참고).

### 3.2 WebtoB 설정 — 필요한 동작

| # | 필요한 동작 | 이유 | 참고(nginx 구현: `docker/nginx.conf`) |
|---|------------|------|------|
| 1 | `/law/` 요청을 `/webapps/law/current/` 의 **정적 파일**로 응답 | 서비스 본체 | `root`, `location /` |
| 2 | `/law/` 가 **JEUS 로 넘어가지 않게** (JEUS 로 보내는 `/` 전체 매핑이 있으면 `/law/` 를 정적 처리로 우선) | 넘어가면 404·500 | — |
| 3 | 폴더 주소의 기본 문서 = `index.html` (`/law/book/` → `book/index.html`) | 모든 화면이 폴더 주소 | `index index.html`, `try_files $uri $uri/` |
| 4 | MIME 등록: `.html` `.css` `.js` `.json` **`.txt`** **`.woff2`** `.svg` | `.txt` 는 화면 이동 때 내려받는 데이터, `.woff2` 는 글꼴 | 기본 mime.types |
| 5 | 압축(gzip): html·css·js·json·txt·svg | `fulltext.json`·화면 데이터가 커서 체감 속도 차이 큼 | `gzip on` |
| 6 | 캐시: `/law/_next/static/`·`/law/fonts/` 길게(1년), `/law/data/`·html 은 캐시 안 함 | 해시 파일은 바뀌지 않음, 데이터는 매주 바뀜 | `expires 1y` / `expires -1` |
| 7 | (권장) 보안 헤더: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, CSP | 정적 사이트 기본 보호 | `add_header …` |
| 8 | (선택) `/law/` 아래 없는 주소 → `/law/404.html` | 안내 화면 | `error_page 404` |

CSP 값(외부 리소스 없음):
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'none'
```

### 3.3 WebtoB `http.m` 예시 (버전에 맞게 조정)

```text
# ── 기존 *DOMAIN, *NODE, *VHOST 는 그대로 두고 아래 항목만 추가 ──

*SVRGROUP
htmlg           SVRTYPE = HTML            # 정적 파일 서버 그룹 (이미 있으면 기존 것 사용)

*SERVER
html            SVGNAME = htmlg, MinProc = 2, MaxProc = 10

*ALIAS
law_alias       URI = "/law/", RealPath = "/webapps/law/current/"

*URI
# JEUS 로 보내는 URI 보다 /law/ 가 정적(HTML) 처리되도록 — 기존 JSV 매핑과 겹치지 않게 확인
uri_law         Uri = "/law/", SvrType = HTML

*EXT
html            MimeType = "text/html; charset=utf-8",        SvrType = HTML
css             MimeType = "text/css",                         SvrType = HTML
js              MimeType = "application/javascript",           SvrType = HTML
json            MimeType = "application/json; charset=utf-8",  SvrType = HTML
txt             MimeType = "text/plain; charset=utf-8",        SvrType = HTML
woff2           MimeType = "font/woff2",                       SvrType = HTML
svg             MimeType = "image/svg+xml",                    SvrType = HTML
ico             MimeType = "image/x-icon",                     SvrType = HTML
```

- **기본 문서(3번)**: `*NODE`(또는 `*VHOST`)의 인덱스 파일 설정이 `index.html` 인지 확인한다(대부분 기본값).
- **압축·캐시·응답 헤더(5~7번)**: 사용 중인 버전이 제공하는 압축·만료(Expires)·응답 헤더 추가 기능으로 설정한다. 같은 서버의 다른 서비스가 쓰는 방식을 따르면 된다.
- **404(8번)**: 오류 문서 설정이 서버 전체에 적용되는 구조라면 다른 서비스에 영향이 가므로 **생략**한다(WebtoB 기본 404 화면으로 충분).
- 적용: 설정 컴파일(예: `wscfl -i http.m`) 후 운영 절차에 따라 재기동 또는 재적용.

---

## 4. 배포 절차 (최초·갱신 공통)

### 4.1 패키지 받기 (외부망)

**방법 A — GitHub Actions 아티팩트 (권장)**
1. https://github.com/willy39/krc-lawmap/actions → **Internal package (apps.redcross.or.kr/law)** 워크플로
2. 배포할 실행(main 의 최신 커밋) → 하단 **Artifacts** 의 `krc-lawmap-internal-<커밋>` 다운로드
3. 압축을 풀면 `krc-lawmap-law-YYYYMMDD-<커밋>.zip` 과 `.zip.sha256` 이 나온다

**방법 B — 담당자 PC 에서 직접 만들기**
```bash
git pull
npm ci
npm run package:internal        # → dist/krc-lawmap-law-YYYYMMDD-<커밋>.zip (+ .sha256)
```
스크립트가 빌드 후 자동으로 확인하는 것: 경로가 `/law/` 로 시작, 웹폰트 내장, 외부 CDN 참조 없음, 필수 파일 존재.

### 4.2 무결성 확인·반입

```bash
sha256sum -c krc-lawmap-law-20261026-63258e2.zip.sha256    # macOS: shasum -a 256 -c …
```
→ `OK` 확인 후 내부 반입 절차(망연계 등)로 zip 과 .sha256 을 서버에 옮기고, 서버에서 한 번 더 `sha256sum -c`.

### 4.3 서버 배포

```bash
REL=20261026-63258e2                        # zip 이름의 날짜-커밋
cd /webapps/law/releases
mkdir "$REL" && unzip -q /반입경로/krc-lawmap-law-$REL.zip -d "$REL"
chmod -R a+rX "$REL"                        # WebtoB 실행 계정이 읽을 수 있게 (운영 정책에 맞게)
cat "$REL/VERSION.txt"                      # base_path=/law/ 인지 확인

# 교체 (원자적) — 링크만 바꾸므로 서비스 중단 없음
ln -sfn "/webapps/law/releases/$REL" /webapps/law/current

# 심볼릭 링크를 쓰지 않는 환경이면:
#   mv /webapps/law/current /webapps/law/prev && mv "/webapps/law/releases/$REL" /webapps/law/current
```

정적 파일 교체이므로 **WebtoB 재기동은 필요 없다**(설정을 바꾼 최초 1회만 필요).

### 4.4 배포 확인 체크리스트

| 확인 | 방법 |
|------|------|
| 버전 | `https://apps.redcross.or.kr/law/VERSION.txt` 의 `data_base_date`·`commit` 이 반입한 것과 같은지 |
| 첫 화면 | `/law/` — 법규 체계도가 보이고 칸을 누르면 아래 목록이 열림 |
| 하위 화면 | `/law/book/` `/law/tree/` `/law/cases/` — 주소를 직접 입력해도 열림 |
| 글꼴 | 화면 글꼴이 Pretendard (개발자도구 → 네트워크에 `/law/fonts/...woff2` 200) |
| 검색 | ⌘K(Ctrl+K) → `헌혈증서` 입력 → '조문 내용' 결과가 나옴 (`/law/data/fulltext.json` 200) |
| 화면 이동 | 메뉴를 눌러 이동해도 오류 없음 (`index.txt` 200, MIME text/plain) |
| 압축 | 응답 헤더 `Content-Encoding: gzip` (html·json) |

### 4.5 롤백

```bash
ls /webapps/law/releases                           # 직전 릴리스 확인
ln -sfn /webapps/law/releases/<직전REL> /webapps/law/current
```
릴리스 폴더는 **최근 3개**를 남기고 정리한다.

---

## 5. 정기 갱신 (주 1회)

| 단계 | 언제 | 누가 | 할 일 |
|------|------|------|------|
| ① 자동 수집 | 매주 월 06:00 KST | GitHub Actions (Refresh data) | 법제처 API 수집 → **데이터 갱신 PR** 생성 (실패·건수 급감 시 이슈 생성, 기존 데이터 유지) |
| ② 검수·머지 | 월요일 중 | 서비스 담당자 | PR 본문의 규범 변경·신규 판례·검수 대기 목록 확인 → 필요 시 `data/review.yaml` 수정 → 머지 |
| ③ 패키지 생성 | 머지 직후 자동 | GitHub Actions (Internal package) | `/law` 용 zip 아티팩트 생성 (GitHub Pages 공개본도 함께 갱신) |
| ④ 반입·배포 | 반입 절차 일정에 맞춰 | 서비스 담당자 → 운영 담당자 | 4.1 ~ 4.4 |

- 수집 실패 이슈가 열리면: `docs/manual-refresh.md` 절차(담당자 PC 수집) → PR → ③ 부터 진행.
- 긴급 반영: Actions 에서 **Refresh data** 를 수동 실행(`Run workflow`) 후 ② 부터.
- 화면·기능 수정 배포도 같은 경로다(main 머지 → ③ → ④).

### 데이터별 갱신 방식

| 데이터 | 갱신 | 비고 |
|--------|------|------|
| 법령·행정규칙·조례·기관규정·조약·판례·해석, 조문 본문 | 주간 자동 수집 | `npm run data` |
| 법규집 연계 최신 법령(근로기준법·시행령) | 주간 자동 수집 | `data/overrides.yaml` `book_laws` |
| 법규집 편제·순번(I~VII, 기타규칙·폐지규정 목록) | **수동** | 법규집 사이트 편제가 바뀌면 `data/krc-order.yaml` 갱신 |
| 판례·해석 검수 | 수동 | `data/review.yaml` (`docs/review-guide.md`) |

---

## 6. 운영·보안 참고

- 서버에는 **정적 파일만** 있다. 서버 쪽 실행 코드·DB·비밀값·이용자 정보 수집이 없다.
- 법제처 인증키(LAW_OC)는 GitHub Secret 에만 있으며 산출물에 포함되지 않는다(빌드 스크립트·검증에서 `OC=` 노출 검사).
- 원문 링크: law.go.kr(HTTPS), 법규집 화면 law.redcross.or.kr(**HTTP만 제공**) — 내부망에서 외부 접속이 막혀 있으면 목록·검색·체계도는 정상이고 원문만 열리지 않는다.
- 웹폰트: Pretendard(SIL Open Font License 1.1)를 `fonts/pretendard/` 에 내장했다. 라이선스 고지는 CSS 머리 주석과 `public/fonts/pretendard/README.md` 에 있다.
- 접근 로그 외에 별도 로그는 없다.

---

## 7. (참고) 다른 배포 방식

| 방식 | 언제 | 방법 |
|------|------|------|
| JEUS WAR | "앱은 JEUS 에 배포" 규정이 있을 때 | zip 내용을 WAR 루트에 넣고 컨텍스트 경로 `/law`, `web.xml` 에 welcome-file `index.html`. 정적 파일만 내보내므로 WebtoB 정적 서비스보다 이점은 없다 |
| Docker | 컨테이너 허용 시 | `BASE_PATH=/law docker compose up -d --build web` (nginx 비루트, 8080) → WebtoB/L4 에서 `/law/` 프록시 |

---

## 8. 문제 해결

| 증상 | 원인 | 조치 |
|------|------|------|
| 글자만 보이고 화면 모양이 깨짐 | CSS·JS 404 — 빌드 경로(`/law`)와 서비스 경로 불일치 | `VERSION.txt` 의 `base_path` 확인, `/law/` 에 풀었는지 확인. 다른 경로면 `BASE_PATH=/경로 npm run package:internal` 로 다시 빌드 |
| `/law/book/` 등 하위 주소 404 | 폴더 기본 문서(index.html) 미설정, 또는 JEUS 로 넘어감 | 3.2 의 2·3번 |
| 메뉴 이동 시 오류·전체 새로고침 | `.txt` MIME 미등록 또는 차단 | 3.2 의 4번 (`text/plain`) |
| 글꼴이 바뀌지 않음 | `.woff2` MIME 미등록 | 3.2 의 4번 (`font/woff2`) |
| 조문 내용 검색이 느림 | `fulltext.json`(3.3MB) 압축 안 됨 | 3.2 의 5번 (gzip) |
| 배포했는데 예전 화면 | 브라우저·프록시 캐시 | html·`/law/data/` 캐시 끄기(3.2 의 6번), 강력 새로고침 |
| 원문↗ 이 안 열림 | 내부망에서 외부 사이트 차단 | 6장 — 외부 접속 허용 범위 확인 |

---

## 9. 명령 모음

```bash
# 외부(패키지 만들기)
npm ci && npm run package:internal
BASE_PATH=/other npm run package:internal          # 다른 경로용

# 내부(배포)
sha256sum -c krc-lawmap-law-<REL>.zip.sha256
unzip -q krc-lawmap-law-<REL>.zip -d /webapps/law/releases/<REL>
ln -sfn /webapps/law/releases/<REL> /webapps/law/current
curl -s https://apps.redcross.or.kr/law/VERSION.txt
```
