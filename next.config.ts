import type { NextConfig } from 'next';

// GitHub Pages(프로젝트 페이지)는 /<repo> 하위 경로에서 서비스되므로 빌드 시 BASE_PATH를 주입한다.
// 내부 서버(Docker/nginx)는 기본값 '' (루트)로 빌드한다.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
