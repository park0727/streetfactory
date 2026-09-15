import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, supabaseSecretKey } from "@/lib/env";

/** 서비스 역할 클라이언트. 사용자 생성/비밀번호 초기화 등 admin 작업 전용. 브라우저로 절대 노출 금지. */
export function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, supabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
