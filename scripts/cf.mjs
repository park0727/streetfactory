/**
 * OpenNext Cloudflare 빌드/배포/프리뷰 래퍼.
 *   node scripts/cf.mjs deploy | preview | build
 * wrangler 가 Hyperdrive 바인딩의 로컬 에뮬레이션 값을 요구하므로 .env.secrets 의 DATABASE_URL 을 넣어 준다
 * (빌드 결과물에는 들어가지 않는다 — 실제 배포는 Hyperdrive 바인딩을 쓴다).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const cmd = process.argv[2] ?? "build";
if (existsSync(".env.secrets")) {
  for (const [k, v] of Object.entries(parseEnv(readFileSync(".env.secrets", "utf8")))) if (process.env[k] === undefined) process.env[k] = v;
}
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??= process.env.DATABASE_URL ?? "postgresql://localhost:5432/postgres";
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

const steps = cmd === "build" ? [["build"]] : [["build"], [cmd]];
for (const args of steps) {
  const r = spawnSync("npx", ["opennextjs-cloudflare", ...args], { stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
