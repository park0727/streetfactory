import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// next dev 에서만 Cloudflare 바인딩(env)을 에뮬레이션한다. 빌드 시 실행하면 Hyperdrive 로컬 설정을 요구하며 실패한다.
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Workers 는 이미지 최적화 서버가 없으므로 원본 그대로 서빙.
  images: { unoptimized: true },
  // postgres.js 는 번들하지 않고 Node 모듈로 그대로 쓴다 (Turbopack 번들 시 연결이 멈추는 문제 회피).
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
