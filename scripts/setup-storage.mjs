/**
 * 공개 이미지 버킷(배너·브랜드 로고) 생성. 한 번만 실행.
 *   node --env-file=.env.secrets --env-file=.env.local scripts/setup-storage.mjs
 */
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = "public-assets";
const { data: list } = await sb.storage.listBuckets();
const opts = { public: true, fileSizeLimit: "3MB", allowedMimeTypes: ["image/webp", "image/png", "image/jpeg", "image/svg+xml"] };
if (list?.some((b) => b.name === BUCKET)) {
  const { error } = await sb.storage.updateBucket(BUCKET, opts);
  console.log(error ? `업데이트 실패: ${error.message}` : `버킷 ${BUCKET} 설정 갱신`);
} else {
  const { error } = await sb.storage.createBucket(BUCKET, opts);
  console.log(error ? `생성 실패: ${error.message}` : `버킷 ${BUCKET} 생성`);
}
