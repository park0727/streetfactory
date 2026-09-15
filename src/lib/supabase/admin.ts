import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/** 서비스 역할 클라이언트. 사용자 생성/비밀번호 초기화 등 admin 작업 전용. 브라우저로 절대 노출 금지. */
export function createSupabaseAdmin() {
  // 런타임에 읽는다 (Workers 는 secret, 로컬은 .env.development.local). 빌드 시 인라인되지 않게 함수 안에 둔다.
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY 가 설정되지 않았습니다.");
  return createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
