/**
 * 업무 데이터 초기화. 부품·거래처·카테고리·공급사·입고·출고·재고이동·채번을 모두 지운다.
 * 사용자(profiles/auth)와 판매채널은 남긴다. 되돌릴 수 없다.
 *   node --env-file=.env.secrets --env-file=.env.local scripts/reset-data.mjs --yes [--delete-user email]
 */
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
if (!args.includes("--yes")) {
  console.error("되돌릴 수 없는 작업입니다. 실행하려면 --yes 를 붙이세요.");
  process.exit(1);
}
const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL, { max: 1 });
const before = await sql`select (select count(*) from parts)::int parts, (select count(*) from partners)::int partners, (select count(*) from sales_orders)::int sales, (select count(*) from inbound_orders)::int inbound, (select count(*) from stock_movements)::int moves`;
console.log("삭제 전:", before[0]);
await sql`truncate stock_movements, sales_lines, sales_orders, inbound_lines, inbound_orders, parts, partners, suppliers, categories, doc_sequences restart identity cascade`;
console.log("업무 데이터를 모두 지웠습니다.");

const di = args.indexOf("--delete-user");
if (di >= 0 && args[di + 1]) {
  const email = args[di + 1];
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
  const rows = await sql`select id from profiles where email = ${email}`;
  for (const r of rows) {
    const { error } = await sb.auth.admin.deleteUser(r.id);
    if (error) console.error("auth 삭제 실패:", error.message);
    await sql`delete from profiles where id = ${r.id}`;
    console.log("사용자 삭제:", email);
  }
}
await sql.end();
