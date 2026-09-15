"use server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "비밀번호가 일치하지 않습니다." });

/**
 * 비밀번호 변경.
 * 로그인 사용자는 서명 검증된 JWT(requireUser) 로 확인하고, 실제 변경은 관리자 API 로 한다.
 * 서버 액션에서 세션 쿠키로 updateUser 를 부르면 토큰 갱신 타이밍에 따라 "Auth session missing" 이 나는 경우가 있어 쓰지 않는다.
 */
export async function changePassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const r = schema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };

  const sb = createSupabaseAdmin();
  const { error } = await sb.auth.admin.updateUserById(me.id, { password: r.data.password });
  if (error) {
    const msg = /different|same password/i.test(error.message) ? "이전과 다른 비밀번호를 사용하세요." : error.message;
    return { ok: false, error: `변경 실패: ${msg}` };
  }
  await db.update(profiles).set({ mustChangePassword: false }).where(eq(profiles.id, me.id));
  return { ok: true, message: "비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 쓰세요." };
}
