import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Supabase Supavisor(트랜잭션 풀러, 6543) 용 postgres.js 클라이언트.
 * - prepare: false — 트랜잭션 풀러는 prepared statement 를 지원하지 않는다.
 * - max: 5 — **1 로 두면 안 된다.** 연결 1개에 쿼리를 파이프라이닝하면 풀러가 응답을 멈춘다
 *   (레이아웃 + 페이지가 동시에 쿼리하는 Next 구조에서 항상 발생). 5 는 Workers 의 동시 소켓 한도(6) 안이다.
 * - 페이지에서 Promise.all 로 동시에 보내는 쿼리는 5개 이하로 유지한다.
 * - postgres.js 는 첫 쿼리 때 접속하므로 빌드 단계에서는 접속하지 않는다.
 */
function createDb() {
  const url = process.env.DATABASE_URL ?? "postgres://missing:missing@localhost:1/missing";
  const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

// next dev 의 HMR 에서 연결이 계속 늘어나는 것을 막기 위해 전역에 캐시한다.
const globalForDb = globalThis as unknown as { __db?: Db };
export const db: Db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
