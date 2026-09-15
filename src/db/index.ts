import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Cloudflare Workers + Supavisor(트랜잭션 풀러) 용 클라이언트.
 * - prepare: false — 트랜잭션 풀러는 prepared statement 를 지원하지 않는다.
 * - max: 1 — Worker 인스턴스 하나당 연결 하나면 충분하다.
 * - 첫 사용 시점에 연결을 만든다. 빌드(페이지 데이터 수집) 단계에는 DATABASE_URL 이 없기 때문이다.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 이 설정되지 않았습니다.");
  const client = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;

// next dev 의 HMR 에서 연결이 계속 늘어나는 것을 막기 위해 전역에 캐시한다.
const globalForDb = globalThis as unknown as { __db?: Db };

function getDb(): Db {
  if (!globalForDb.__db) globalForDb.__db = createDb();
  return globalForDb.__db;
}

/** 지연 초기화 프록시. `db.select()` 처럼 기존 방식 그대로 쓴다. */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export type { Db };
export { schema };
