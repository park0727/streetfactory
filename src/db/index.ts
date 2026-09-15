import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Cloudflare Workers + Supavisor(트랜잭션 풀러) 용 클라이언트.
 * - prepare: false — 트랜잭션 풀러는 prepared statement 를 지원하지 않는다.
 * - max: 1 — Worker 인스턴스 하나당 연결 하나면 충분하다.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 이 설정되지 않았습니다.");
  const client = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

// next dev 의 HMR 에서 연결이 계속 늘어나는 것을 막기 위해 전역에 캐시한다.
const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createDb> };
export const db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export type Db = typeof db;
export { schema };
