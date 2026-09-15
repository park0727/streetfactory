"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  // 임시 비밀번호 상태면 레이아웃의 2차 리다이렉트 없이 바로 변경 화면으로 (빈 화면 방지)
  const [p] = await db.select({ must: profiles.mustChangePassword, active: profiles.isActive }).from(profiles).where(eq(profiles.id, data.user.id));
  if (p && !p.active) {
    await supabase.auth.signOut();
    return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
  }
  if (p?.must) redirect("/settings/profile");
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
