/**
 * 첫 관리자 계정 생성.
 *   node --env-file=.env.local scripts/create-admin.mjs admin@example.com "홍길동"
 * 임시 비밀번호를 출력한다. 첫 로그인 후 변경해야 한다.
 */
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const [email, name = "관리자"] = process.argv.slice(2);
if (!email) {
  console.error("사용법: node --env-file=.env.local scripts/create-admin.mjs <email> [이름]");
  process.exit(1);
}
const { NEXT_PUBLIC_SUPABASE_URL: url, DATABASE_URL } = process.env;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !DATABASE_URL) {
  console.error(".env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DATABASE_URL 이 필요합니다.");
  process.exit(1);
}

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const password = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => chars[b % chars.length]).join("");

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
if (error) {
  console.error("계정 생성 실패:", error.message);
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
await sql`
  insert into profiles (id, email, name, role, can_parts, can_repair, must_change_password, is_active)
  values (${data.user.id}, ${email}, ${name}, 'admin', true, true, true, true)
  on conflict (id) do update set name = ${name}, role = 'admin', can_parts = true, can_repair = true, is_active = true
`;
await sql.end();

console.log("관리자 계정을 만들었습니다.");
console.log("  이메일:      ", email);
console.log("  임시 비밀번호:", password);
