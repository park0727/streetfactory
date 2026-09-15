/**
 * .env.secrets 를 읽어 next dev 를 실행한다.
 * (`node --env-file` 은 next 가 자식 프로세스에 NODE_OPTIONS 로 넘길 때 거부되므로 래퍼로 주입한다.)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env.secrets")) process.loadEnvFile(".env.secrets");
else console.warn("[dev] .env.secrets 가 없습니다. DB/비밀 키 없이 실행합니다.");

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
