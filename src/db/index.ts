import { cache } from "react";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * postgres.js 클라이언트.
 * - 프로덕션(Cloudflare Workers): Hyperdrive 바인딩의 connectionString 을 쓴다. Hyperdrive 가 DB(서울) 근처에서
 *   연결 풀을 유지하므로 Worker 가 먼 PoP 에서 실행돼도 접속 왕복이 크게 줄어든다.
 *   Workers 는 다른 요청이 만든 소켓을 쓸 수 없으므로 **요청마다 새 클라이언트**를 만들고, React cache() 로 같은 요청 안에서만 재사용한다.
 * - 개발(Node): DATABASE_URL 로 전역 1개. HMR 로 연결이 늘어나는 것을 막는다.
 * - prepare: false — Supavisor 트랜잭션 풀러 호환. max: 5 — 1 로 두면 파이프라이닝으로 응답이 멈춘다 (Workers 소켓 한도 6 안).
 * - fetch_types: false — 접속마다 타입 조회 왕복을 없앤다 (배열 타입 컬럼을 쓰지 않는다).
 */
function createDb(url: string) {
  const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10, fetch_types: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

const FALLBACK = "postgres://missing:missing@localhost:1/missing";

function connectionString(): string {
  if (process.env.NODE_ENV === "production") {
    try {
      const env = getCloudflareContext().env as { HYPERDRIVE?: { connectionString: string } };
      if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
    } catch {
      // Cloudflare 컨텍스트 밖(빌드 등)이면 DATABASE_URL 로
    }
  }
  return process.env.DATABASE_URL ?? FALLBACK;
}

const globalForDb = globalThis as unknown as { __db?: Db };
const perRequest = cache(() => createDb(connectionString()));

function current(): Db {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForDb.__db) globalForDb.__db = createDb(connectionString());
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
