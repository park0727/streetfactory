/**
 * .env.secrets 를 읽어 next dev 를 실행한다.
 * - 이미 셸에 있는 변수는 덮어쓰지 않는다 (예: DATABASE_URL=postgresql://localhost/... npm run dev 로 로컬 DB 사용).
 * - `node --env-file` 은 next 가 자식 프로세스에 NODE_OPTIONS 로 넘길 때 거부되므로 래퍼로 주입한다.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

if (existsSync(".env.secrets")) {
  const parsed = parseEnv(readFileSync(".env.secrets", "utf8"));
  for (const [k, v] of Object.entries(parsed)) if (process.env[k] === undefined) process.env[k] = v;
} else {
  console.warn("[dev] .env.secrets 가 없습니다. DB/비밀 키 없이 실행합니다.");
}
if (/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) console.log("[dev] 로컬 DB 사용:", process.env.DATABASE_URL);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
