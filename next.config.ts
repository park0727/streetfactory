import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// next dev 에서도 Cloudflare 바인딩(env)에 접근할 수 있게 한다.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Workers 는 이미지 최적화 서버가 없으므로 원본 그대로 서빙.
  images: { unoptimized: true },
};

export default nextConfig;
