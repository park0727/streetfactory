"use client";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { createImageUpload } from "@/lib/upload-actions";

const BUCKET = "public-assets";

/** 긴 변 기준으로 줄여 webp 로 변환. 투명 배경 유지. SVG 는 그대로. */
async function shrink(file: File, maxW: number, maxH: number): Promise<{ blob: Blob; ext: "webp" | "svg" }> {
  if (file.type === "image/svg+xml") return { blob: file, ext: "svg" };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("이미지 변환 실패"))), "image/webp", 0.86));
  return { blob, ext: "webp" };
}

/** 이미지 1장을 줄여서 올리고 공개 URL 을 돌려준다. */
export async function uploadImage(file: File, kind: "brand" | "banner"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");
  const { blob, ext } = kind === "banner" ? await shrink(file, 1600, 900) : await shrink(file, 480, 160);
  const r = await createImageUpload(kind, ext);
  if (!r.ok) throw new Error(r.error);
  const { error } = await createSupabaseBrowser().storage.from(BUCKET).uploadToSignedUrl(r.data.path, r.data.token, blob, { contentType: ext === "svg" ? "image/svg+xml" : "image/webp" });
  if (error) throw new Error(`올리지 못했습니다: ${error.message}`);
  return r.data.publicUrl;
}
