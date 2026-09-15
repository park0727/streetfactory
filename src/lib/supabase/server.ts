import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/lib/env";

/** 서버 컴포넌트 / Server Action 에서 쓰는 Supabase 클라이언트 (사용자 세션 기준). */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서 호출되면 쿠키를 쓸 수 없다. proxy.ts 가 세션 갱신을 담당한다.
        }
      },
    },
  });
}
