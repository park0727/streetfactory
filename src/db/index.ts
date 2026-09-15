import { cache } from "react";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Supabase Supavisor(트랜잭션 풀러, 6543) 용 postgres.js 클라이언트.
 * - prepare: false — 트랜잭션 풀러는 prepared statement 를 지원하지 않는다.
 * - max: 5 — **1 로 두면 안 된다.** 연결 1개에 쿼리를 파이프라이닝하면 풀러가 응답을 멈춘다.
 *   5 는 Workers 의 동시 소켓 한도(6) 안이다. 페이지 하나의 Promise.all 은 5개 이하로.
 *
 * 인스턴스 수명:
 * - 개발(Node): 전역 1개. HMR 로 연결이 늘어나는 것을 막는다.
 * - 프로덕션(Cloudflare Workers): **요청마다 새 클라이언트**. Workers 는 다른 요청이 만든 소켓을 쓸 수 없으므로
 *   전역 캐시를 쓰면 "Failed query" 로 간헐 실패한다. React cache() 로 같은 요청 안에서는 재사용한다.
 */
function createDb() {
  const url = process.env.DATABASE_URL ?? "postgres://missing:missing@localhost:1/missing";
  const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __db?: Db };
const perRequest = cache(() => createDb());

function current(): Db {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForDb.__db) globalForDb.__db = createDb();
    return globalForDb.__db;
  }
  return perRequest();
}

/** 호출 시점의 클라이언트로 위임하는 프록시. 기존처럼 `db.select()` 로 쓴다. */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = current() as unknown as Record<PropertyKey, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export { schema };
