"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partnerApplications } from "@/db/schema";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/push-notify";
import { firstIssue } from "@/lib/action-result";

export type SignupState = { error?: string; values?: Record<string, string> } | undefined;

const opt = (max: number) => z.string().trim().max(max).optional();
const schema = z
  .object({
    companyName: z.string().trim().min(1, "가게(상호) 이름을 입력하세요.").max(100),
    contactName: z.string().trim().min(1, "담당자 이름을 입력하세요.").max(50),
    phone: z
      .string()
      .trim()
      .refine((v) => v.replace(/\D/g, "").length >= 9, "연락처를 정확히 입력하세요. 예: 010-1234-5678")
      .pipe(z.string().max(30)),
    bizNo: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || v.length === 10, "사업자등록번호는 숫자 10자리입니다. 예: 123-45-67890")
      .optional(),
    address: opt(200),
    memo: opt(500),
    email: z.email("로그인에 쓸 이메일을 정확히 입력하세요. 예: shop@naver.com").trim().toLowerCase(),
    password: z.string().min(8, "비밀번호는 8자 이상으로 정해 주세요.").max(72),
    password2: z.string(),
    agree: z.literal(true, "개인정보 수집·이용에 동의해 주세요."),
  })
  .refine((v) => v.password === v.password2, { message: "비밀번호 확인이 맞지 않습니다. 같은 비밀번호를 두 번 입력하세요.", path: ["password2"] });

/** 주문 화면 거래처 가입 신청. 로그인 계정을 바로 만들되, 승인 전에는 주문 계정이 없어 로그인되지 않는다. */
export async function submitSignup(_: SignupState, fd: FormData): Promise<SignupState> {
  const values: Record<string, string> = {};
  for (const k of ["companyName", "contactName", "phone", "bizNo", "address", "memo", "email"]) values[k] = String(fd.get(k) ?? "");
  // 자동 입력 로봇용 함정 칸. 사람에게는 보이지 않는다.
  if (String(fd.get("website") ?? "") !== "") redirect("/signup?done=1");

  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v));
  raw.agree = fd.get("agree") === "true";
  raw.password2 = String(fd.get("password2") ?? "");
  const r = schema.safeParse(raw);
  if (!r.success) return { error: firstIssue(r.error.issues), values };
  const d = r.data;

  // 같은 연락처로 검토 중인 신청이 있으면 다시 받지 않는다. 전체 대기 건수도 제한 (장난 신청 방지)
  const [[{ samePhone }], [{ pending }]] = await Promise.all([
    db.select({ samePhone: count() }).from(partnerApplications).where(and(eq(partnerApplications.status, "pending"), sql`regexp_replace(${partnerApplications.phone}, '\\D', '', 'g') = ${d.phone.replace(/\D/g, "")}`)),
    db.select({ pending: count() }).from(partnerApplications).where(eq(partnerApplications.status, "pending")),
  ]);
  if (samePhone > 0) return { error: "이 연락처로 이미 가입 신청을 하셨습니다. 확인 후 연락드리겠습니다.", values };
  if (pending >= 100) return { error: "지금은 신청을 받을 수 없습니다. 전화로 문의해 주세요.", values };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email: d.email, password: d.password, email_confirm: true, user_metadata: { kind: "customer", name: d.contactName } });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    return { error: /already|exists|registered/i.test(msg) ? "이미 사용 중인 이메일입니다. 다른 이메일을 입력하거나, 이미 가입하셨다면 로그인해 주세요." : "신청을 저장하지 못했습니다. 잠시 뒤 다시 시도하거나 전화로 문의해 주세요.", values };
  }
  try {
    await db.insert(partnerApplications).values({
      userId: data.user.id,
      email: d.email,
      companyName: d.companyName,
      bizNo: d.bizNo || null,
      contactName: d.contactName,
      phone: d.phone,
      address: d.address ?? null,
      memo: d.memo ?? null,
    });
  } catch (e) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    console.error("[signup] 저장 실패", e);
    return { error: "신청을 저장하지 못했습니다. 잠시 뒤 다시 시도하거나 전화로 문의해 주세요.", values };
  }

  after(async () => {
    try {
      await notifyStaff({ title: `거래처 가입 신청 · ${d.companyName}`, body: `${d.contactName} · ${d.phone} — 확인 후 승인해 주세요`, url: "/partners/applications", tag: `signup-${data.user.id}` });
    } catch (e) {
      console.error("[push] 가입 신청 알림 실패", e);
    }
  });
  redirect("/signup?done=1");
}
