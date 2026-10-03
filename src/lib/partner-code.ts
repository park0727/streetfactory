import "server-only";
import { sql } from "drizzle-orm";

type Tx = { execute: (q: ReturnType<typeof sql>) => Promise<unknown> };

/** 새 거래처 코드 (P-0001). fn_next_seq 로 채번한다. 트랜잭션 안에서 부른다. */
export async function nextPartnerCode(tx: Tx) {
  const r = await tx.execute(sql`select public.fn_next_seq('P', 0) as n`);
  const n = Number((r as { n: number }[])[0]?.n ?? (r as { rows?: { n: number }[] }).rows?.[0]?.n);
  return `P-${String(n).padStart(4, "0")}`;
}
