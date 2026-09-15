import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";

/** 현재 로그인 사용자의 profile. 없으면 null. 요청 단위로 캐시된다. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
});

/** 로그인 + 활성 계정 필수. 아니면 /login 으로. */
export async function requireUser(): Promise<Profile> {
  const p = await getProfile();
  if (!p || !p.isActive) redirect("/login?reason=inactive");
  return p;
}

export async function requireAdmin(): Promise<Profile> {
  const p = await requireUser();
  if (p.role !== "admin") redirect("/?denied=1");
  return p;
}

export async function requireModule(mod: "parts" | "repair"): Promise<Profile> {
  const p = await requireUser();
  const ok = mod === "parts" ? p.canParts : p.canRepair;
  if (!ok && p.role !== "admin") redirect("/?denied=1");
  return p;
}
