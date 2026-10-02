"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customerAccounts, partners } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const BAN = "876600h";
function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => chars[b % chars.length]).join("");
}

const createSchema = z.object({
  partnerId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "사용자 이름을 입력하세요.").max(50),
  email: z.email("이메일 형식이 아닙니다. 예: shop@example.com").trim(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72).optional(),
  mustChange: z.boolean(),
});

/** 거래처 주문 계정 생성. 비밀번호를 비우면 임시 비밀번호를 만들어 한 번 보여준다. */
export async function createCustomerAccount(_: unknown, fd: FormData): Promise<ActionResult<{ email: string; password: string | null }>> {
  await requireModule("parts");
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v));
  raw.mustChange = fd.get("mustChange") === "true";
  const r = createSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { partnerId, name, email, mustChange } = r.data;
  const [p] = await db.select({ id: partners.id }).from(partners).where(eq(partners.id, partnerId));
  if (!p) return { ok: false, error: "거래처를 찾을 수 없습니다." };

  const password = r.data.password ?? tempPassword();
  const { data, error } = await createSupabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { kind: "customer", name } });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    return { ok: false, error: /already|exists|registered/i.test(msg) ? "이미 사용 중인 이메일입니다. 다른 이메일을 입력하세요." : `계정을 만들지 못했습니다: ${msg}` };
  }
  await db.insert(customerAccounts).values({ id: data.user.id, partnerId, email, name, mustChangePassword: mustChange });
  revalidatePath("/partners");
  return { ok: true, message: "주문 계정을 만들었습니다.", data: { email, password: r.data.password ? null : password } };
}

export async function resetCustomerPassword(id: string): Promise<ActionResult<{ password: string }>> {
  await requireModule("parts");
  const password = tempPassword();
  const { error } = await createSupabaseAdmin().auth.admin.updateUserById(id, { password });
  if (error) return { ok: false, error: `비밀번호를 바꾸지 못했습니다: ${error.message}` };
  await db.update(customerAccounts).set({ mustChangePassword: true }).where(eq(customerAccounts.id, id));
  revalidatePath("/partners");
  return { ok: true, message: "임시 비밀번호를 만들었습니다.", data: { password } };
}

export async function setCustomerActive(id: string, active: boolean): Promise<ActionResult> {
  await requireModule("parts");
  const { error } = await createSupabaseAdmin().auth.admin.updateUserById(id, { ban_duration: active ? "none" : BAN });
  if (error) return { ok: false, error: `상태를 바꾸지 못했습니다: ${error.message}` };
  await db.update(customerAccounts).set({ isActive: active }).where(eq(customerAccounts.id, id));
  revalidatePath("/partners");
  return { ok: true, message: active ? "다시 주문할 수 있게 했습니다." : "사용을 중지했습니다. 더 이상 로그인할 수 없습니다." };
}
