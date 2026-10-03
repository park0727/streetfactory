"use server";
import { requireModule } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";

const BUCKET = "public-assets";

/** 이미지 업로드용 서명 URL. 브라우저가 이 URL 로 Supabase Storage 에 직접 올린다 (Worker 를 거치지 않음). */
export async function createImageUpload(kind: "brand" | "banner", ext: "webp" | "png" | "svg"): Promise<ActionResult<{ path: string; token: string; publicUrl: string }>> {
  await requireModule("parts");
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createSupabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: `업로드를 준비하지 못했습니다: ${error?.message ?? ""}` };
  return { ok: true, data: { path, token: data.token, publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` } };
}

/** 우리 버킷의 공개 URL 이면 파일을 지운다 (교체·삭제 시). 실패해도 무시. */
export async function removeImageByUrl(url: string | null | undefined) {
  await requireModule("parts");
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  await createSupabaseAdmin().storage.from(BUCKET).remove([url.split(marker)[1]]);
}
