/**
 * 공개 Supabase 설정. 이 파일은 proxy(미들웨어)와 브라우저에서도 import 되므로 비밀값을 두지 않는다.
 * 새 이름(PUBLISHABLE)과 옛 이름(ANON) 둘 다 받는다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
