# syntax=docker/dockerfile:1
# 대한적십자사 법규 나무 — 내부 서버 포팅용 이미지
#   web       : 정적 산출물(out/)을 nginx(비루트, 8080)로 서비스
#   collector : 법제처 Open API 수집 (npm run data) — data/ 볼륨에 결과 기록

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS collector
COPY . .
ENV NODE_ENV=production
CMD ["npm", "run", "data"]

FROM deps AS builder
COPY . .
# 하위 경로에 배포할 때만 지정 (예: /lawtree). 루트 배포는 비워 둔다.
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH} NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
