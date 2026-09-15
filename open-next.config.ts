import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 무료 플랜: R2/KV 캐시 없이 동작. 필요 시 incrementalCache 추가.
export default defineCloudflareConfig({});
