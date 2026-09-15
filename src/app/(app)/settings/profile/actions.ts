"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "비밀번호가 일치하지 않습니다." });

export async function changePassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const r = schema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: r.data.password });
  if (error) {
    const msg = error.message.includes("different") ? "이전과 다른 비밀번호를 사용하세요." : error.message;
    return { ok: false, error: `변경 실패: ${msg}` };
  }
  await db.update(profiles).set({ mustChangePassword: false }).where(eq(profiles.id, me.id));
  return { ok: true, message: "비밀번호를 변경했습니다." };
}
