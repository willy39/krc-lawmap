#!/usr/bin/env bash
# 내부 서버(WebtoB) 반입용 패키지 생성
#   기본: https://apps.redcross.or.kr/law/ 에 배포 → BASE_PATH=/law
#   사용: npm run package:internal            (BASE_PATH 바꾸려면: BASE_PATH=/other npm run package:internal)
#   결과: dist/krc-lawmap-law-YYYYMMDD-<커밋>.zip (+ .sha256) — zip 안의 파일을 /law 폴더에 그대로 풀면 된다
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_PATH="${BASE_PATH:-/law}"
case "$BASE_PATH" in /*) ;; *) echo "BASE_PATH 는 / 로 시작해야 합니다: $BASE_PATH" >&2; exit 1 ;; esac
BASE_PATH="${BASE_PATH%/}"

echo "▶ 빌드 (NEXT_PUBLIC_BASE_PATH=$BASE_PATH)"
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npm run build

echo "▶ 경로 검증"
grep -q "\"$BASE_PATH/_next/" out/index.html || { echo "✗ out/index.html 의 정적 파일 경로가 $BASE_PATH/ 로 시작하지 않습니다" >&2; exit 1; }
grep -q "$BASE_PATH/fonts/pretendard/" out/index.html || { echo "✗ 웹폰트 경로가 $BASE_PATH/fonts/ 가 아닙니다" >&2; exit 1; }
if grep -rqs "cdn.jsdelivr.net" out --include=*.html; then echo "✗ 외부 CDN 참조가 남아 있습니다" >&2; exit 1; fi
if grep -rqsE "[?&]OC=[^*]" out; then echo "✗ 산출물에 법제처 인증키(OC=)가 노출되어 있습니다" >&2; exit 1; fi
for f in index.html 404.html tree/index.html book/index.html data/norms.json data/fulltext.json data/book-text.json fonts/pretendard/pretendardvariable-dynamic-subset.css making/index.html howto/index.html; do
  [ -f "out/$f" ] || { echo "✗ out/$f 없음" >&2; exit 1; }
done

STAMP="$(date +%Y%m%d)"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
BASEDATE="$(node -e 'console.log(require("./data/build/meta.json").baseDate)')"
cat > out/VERSION.txt <<VER
service=대한적십자사 법규 지도 (KRC Law Map)
base_path=$BASE_PATH/
data_base_date=$BASEDATE
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
commit=$SHA
VER

NAME="krc-lawmap${BASE_PATH//\//-}-$STAMP-$SHA"
mkdir -p dist
rm -f "dist/$NAME.zip"
(cd out && zip -qr -X "../dist/$NAME.zip" .)
if command -v sha256sum >/dev/null; then (cd dist && sha256sum "$NAME.zip" > "$NAME.zip.sha256"); else (cd dist && shasum -a 256 "$NAME.zip" > "$NAME.zip.sha256"); fi

echo "✓ dist/$NAME.zip ($(du -h "dist/$NAME.zip" | cut -f1), 파일 $(find out -type f | wc -l | tr -d ' ')개, 데이터 기준일 $BASEDATE)"
cat "dist/$NAME.zip.sha256"
