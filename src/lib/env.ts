/**
 * Supabase 환경변수. 새 이름(PUBLISHABLE/SECRET)과 옛 이름(ANON/SERVICE_ROLE) 둘 다 받는다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabaseSecretKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
