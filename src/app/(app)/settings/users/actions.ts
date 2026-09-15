"use server";
import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const PATH = "/settings/users";
const BAN_FOREVER = "876600h"; // 100년
const flags = {
  role: z.enum(["admin", "staff"]).default("staff"),
  canParts: z.boolean(),
  canRepair: z.boolean(),
};
const createSchema = z.object({
  email: z.email("이메일 형식이 아닙니다.").trim(),
  name: z.string().trim().min(1, "이름을 입력하세요.").max(50),
  ...flags,
});
const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "이름을 입력하세요.").max(50),
  ...flags,
});

function toObject(fd: FormData) {
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v));
  // 체크박스는 해제 시 값이 실리지 않으므로 명시적으로 판정
  raw.canParts = fd.get("canParts") === "true";
  raw.canRepair = fd.get("canRepair") === "true";
  return raw;
}

/** 읽기 쉬운 임시 비밀번호 (혼동 문자 제외, 10자리) */
function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function adminCount(exceptId?: string) {
  const cond = exceptId
    ? and(eq(profiles.role, "admin"), eq(profiles.isActive, true), ne(profiles.id, exceptId))
    : and(eq(profiles.role, "admin"), eq(profiles.isActive, true));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(profiles).where(cond);
  return n;
}

export async function createUser(_: unknown, fd: FormData): Promise<ActionResult<{ email: string; password: string }>> {
  await requireAdmin();
  const r = createSchema.safeParse(toObject(fd));
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { email, name, role, canParts, canRepair } = r.data;

  const password = tempPassword();
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    return { ok: false, error: msg.includes("already") ? "이미 등록된 이메일입니다." : `계정 생성 실패: ${msg}` };
  }

  // auth.users 트리거가 profiles 행을 만든다. 역할·플래그만 덮어쓴다.
  await db
    .insert(profiles)
    .values({ id: data.user.id, email, name, role, canParts, canRepair, mustChangePassword: true })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { name, role, canParts, canRepair, mustChangePassword: true, isActive: true },
    });

  revalidatePath(PATH);
  return { ok: true, message: "계정을 만들었습니다.", data: { email, password } };
}

export async function updateUser(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const r = updateSchema.safeParse(toObject(fd));
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, name, role, canParts, canRepair } = r.data;

  if (id === me.id && role !== "admin") return { ok: false, error: "자기 자신의 관리자 권한은 해제할 수 없습니다." };
  if (role !== "admin" && (await adminCount(id)) === 0) return { ok: false, error: "관리자가 최소 1명은 있어야 합니다." };

  await db.update(profiles).set({ name, role, canParts, canRepair }).where(eq(profiles.id, id));
  revalidatePath(PATH);
  return { ok: true, message: "저장했습니다." };
}

export async function setUserActive(id: string, active: boolean): Promise<ActionResult> {
  const me = await requireAdmin();
  if (id === me.id) return { ok: false, error: "자기 자신은 비활성화할 수 없습니다." };
  if (!active && (await adminCount(id)) === 0) return { ok: false, error: "관리자가 최소 1명은 있어야 합니다." };

  const sb = createSupabaseAdmin();
  const { error } = await sb.auth.admin.updateUserById(id, { ban_duration: active ? "none" : BAN_FOREVER });
  if (error) return { ok: false, error: `상태 변경 실패: ${error.message}` };

  await db.update(profiles).set({ isActive: active }).where(eq(profiles.id, id));
  revalidatePath(PATH);
  return { ok: true, message: active ? "활성화했습니다." : "비활성화했습니다. 더 이상 로그인할 수 없습니다." };
}

export async function resetPassword(id: string): Promise<ActionResult<{ password: string }>> {
  await requireAdmin();
  const password = tempPassword();
  const sb = createSupabaseAdmin();
  const { error } = await sb.auth.admin.updateUserById(id, { password });
  if (error) return { ok: false, error: `초기화 실패: ${error.message}` };
  await db.update(profiles).set({ mustChangePassword: true }).where(eq(profiles.id, id));
  revalidatePath(PATH);
  return { ok: true, message: "임시 비밀번호를 발급했습니다.", data: { password } };
}
