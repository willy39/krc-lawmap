# 담당자 PC 수집 절차

GitHub Actions(클라우드 IP)에서 법제처 API가 안티봇 페이지를 반환하거나 실패하면 담당자 PC에서 수집한다.

## Node 로 직접
```bash
cp .env.example .env        # LAW_OC= 에 인증키 입력
set -a; . ./.env; set +a
npm ci
npm run data -- --check-links
npm test && npm run build
git checkout -b data/manual-$(date +%F)
git add data/build data/state.json && git commit -m "data: 수동 수집 갱신"
git push -u origin HEAD     # → PR 생성, 검수 대기 목록 확인 후 머지
```

## Docker 로 (내부 서버)
```bash
cp .env.example .env        # LAW_OC 입력
docker compose --profile data run --rm collector
docker compose up -d --build web
```

실패 시 기존 `data/build` 는 그대로 유지된다(빈 응답을 '자료 없음'으로 확정하지 않음).
