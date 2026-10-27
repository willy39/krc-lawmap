# 방문 집계(사용 현황) — GoatCounter

공개 배포처 두 곳의 사용 현황을 **사이트별 대시보드**로 따로 봅니다.

| 배포처 | 주소 | 집계 설정 위치 | 대시보드(예시 코드 기준) |
|---|---|---|---|
| GitHub Pages | https://willy39.github.io/krc-lawmap/ | 저장소 Variables `GOATCOUNTER_CODE` | https://krc-lawmap-gh.goatcounter.com |
| Vercel | https://krc-lawmap.vercel.app | Vercel 환경변수 `NEXT_PUBLIC_GOATCOUNTER` | https://krc-lawmap-vercel.goatcounter.com |
| 내부 서버(/law) | https://apps.redcross.or.kr/law/ | **집계하지 않음** | WebtoB 접근 로그 사용 |

GitHub Pages는 방문 로그를 제공하지 않고, Vercel 무료 요금제는 로그 보존·분석이 제한적이어서 외부 집계 서비스(GoatCounter)를 씁니다.

## 동작 방식
- 화면을 열거나 화면을 옮길 때마다 `https://<코드>.goatcounter.com/count` 로 이미지 요청 1건을 보냅니다(`src/components/common/Analytics.tsx`).
- 보내는 값은 다음과 같습니다.
  - 경로와 쿼리(예: `/list/?source=law`)
  - 화면 제목
  - 유입 경로(referrer)
  - 화면 너비
- 쿠키와 브라우저 저장소를 쓰지 않습니다. GoatCounter는 IP를 저장하지 않고, 방문자 구분에 쓰는 해시도 매일 폐기합니다.
- 빌드에 `NEXT_PUBLIC_GOATCOUNTER` 가 없으면 집계 코드가 아무 일도 하지 않습니다. 내부 서버 패키지와 Docker 빌드에는 넣지 않으므로 외부로 요청이 나가지 않습니다.
- localhost에서는 보내지 않습니다.

## 처음 설정 (한 번)
1. https://www.goatcounter.com 에서 계정을 만들고 첫 사이트 코드를 정합니다(예: `krc-lawmap-gh`).
2. GoatCounter **Settings › Sites › Add site** 에서 두 번째 사이트를 추가합니다(예: `krc-lawmap-vercel`). 계정 하나로 사이트 두 개를 오가며 볼 수 있습니다.
3. GitHub 저장소 **Settings › Secrets and variables › Actions › Variables** 에 `GOATCOUNTER_CODE` = `krc-lawmap-gh` 를 넣습니다. Secret이 아니라 Variable에 넣어야 합니다.
4. Vercel 프로젝트 **Settings › Environment Variables** 에 `NEXT_PUBLIC_GOATCOUNTER` = `krc-lawmap-vercel` 을 넣습니다(Production).
5. main에 다시 푸시하거나 각 배포를 다시 실행하면 집계가 시작됩니다.
   - GitHub Pages: Actions › Deploy GitHub Pages › Run workflow
   - Vercel: Deployments › Redeploy
6. (선택) GoatCounter 사이트별 **Settings**:
   - **Allow anyone to view the dashboard**: 로그인 없이 볼 수 있는 공개 대시보드 링크를 만듭니다.
   - **Ignore IPs**: 사내 IP를 넣어 내부 확인용 방문을 제외합니다.

## 대시보드에서 보는 것
- 기간별 방문 수와 페이지별 조회 수(체계도 `/`, 법규집 `/book/`, 일람 `/list/` 등)
- 유입 경로, 브라우저·OS, 화면 크기, 국가
- **Export** 에서 CSV로 내려받기

## 해제
- 저장소 Variable 또는 Vercel 환경변수를 지우고 다시 배포하면 집계가 멈춥니다.
- Vercel의 CSP(`vercel.json` `img-src`)에 있는 `https://*.goatcounter.com` 은 남겨 둬도 무해합니다.
