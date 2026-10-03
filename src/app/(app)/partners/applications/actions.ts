"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customerAccounts, partnerApplications, partners } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { nextPartnerCode } from "@/lib/partner-code";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";

const approveSchema = z.object({
  id: z.number().int().positive(),
  mode: z.enum(["new", "existing"]),
  partnerId: z.number().int().positive().optional(),
  accountName: z.string().trim().min(1, "주문 계정 사용자 이름을 입력하세요.").max(50),
  partner: z.object({
    name: z.string().trim().min(1, "거래처명을 입력하세요.").max(100),
    type: z.enum(["dealer", "service_center", "direct_store", "online_mall", "other"]),
    bizNo: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || v.length === 10, "사업자등록번호는 숫자 10자리입니다."),
    contactName: z.string().trim().max(50),
    phone: z.string().trim().max(30),
    address: z.string().trim().max(200),
    priceTier: z.enum(["retail", "wholesale"]),
    discountRate: z.number().min(0, "할인율은 0 이상").max(90, "할인율은 90% 이하"),
    defaultTerms: z.enum(["immediate", "credit"]),
    defaultVat: z.boolean(),
  }),
});
export type ApproveInput = z.input<typeof approveSchema>;

const PATHS = ["/partners", "/partners/applications", "/entry", "/"];

/** 화면에 그대로 보여 줄 안내 */
class Notice extends Error {}

/** 가입 승인: 새 거래처를 만들거나 기존 거래처에 연결하고, 신청 때 만든 로그인 계정을 주문 계정으로 연다. */
export async function approveApplication(input: ApproveInput): Promise<ActionResult> {
  const me = await requireModule("parts");
  const r = approveSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  if (d.mode === "existing" && !d.partnerId) return { ok: false, error: "연결할 거래처를 고르세요." };

  const [app] = await db.select().from(partnerApplications).where(eq(partnerApplications.id, d.id));
  if (!app || app.status !== "pending" || !app.userId) return { ok: false, error: "이미 처리된 신청입니다. 화면을 새로고침해 주세요." };
  const { data: u } = await createSupabaseAdmin().auth.admin.getUserById(app.userId);
  if (!u?.user) return { ok: false, error: "신청자의 로그인 계정을 찾을 수 없습니다. 신청을 거절하고 다시 신청하도록 안내해 주세요." };

  try {
    await db.transaction(async (tx) => {
      let pid = d.partnerId ?? 0;
      if (d.mode === "new") {
        const p = d.partner;
        const [row] = await tx
          .insert(partners)
          .values({
            code: await nextPartnerCode(tx),
            name: p.name,
            type: p.type,
            bizNo: p.bizNo || null,
            contactName: p.contactName || null,
            phone: p.phone || null,
            email: app.email,
            address: p.address || null,
            priceTier: p.priceTier,
            discountRate: p.discountRate,
            defaultTerms: p.defaultTerms,
            defaultVat: p.defaultVat,
            memo: app.memo ? `가입 신청 메모: ${app.memo}` : null,
          })
          .returning({ id: partners.id });
        pid = row.id;
      } else {
        const [p] = await tx.select({ id: partners.id }).from(partners).where(eq(partners.id, pid));
        if (!p) throw new Notice("연결할 거래처를 찾을 수 없습니다.");
      }
      await tx.insert(customerAccounts).values({ id: app.userId!, partnerId: pid, email: app.email, name: d.accountName, mustChangePassword: false });
      const done = await tx
        .update(partnerApplications)
        .set({ status: "approved", partnerId: pid, reviewedAt: new Date(), reviewedBy: me.id })
        .where(and(eq(partnerApplications.id, d.id), eq(partnerApplications.status, "pending")))
        .returning({ id: partnerApplications.id });
      if (done.length === 0) throw new Notice("이미 처리된 신청입니다. 화면을 새로고침해 주세요.");
    });
  } catch (e) {
    return { ok: false, error: e instanceof Notice ? e.message : dbErrorMessage(e) };
  }
  PATHS.forEach((p) => revalidatePath(p));
  return { ok: true, message: `승인했습니다. 이제 ${app.email} 로 주문할 수 있습니다.` };
}

/** 가입 거절: 로그인 계정을 지우고 신청 기록만 남긴다 (같은 이메일로 다시 신청할 수 있게). */
export async function rejectApplication(id: number, reason: string): Promise<ActionResult> {
  const me = await requireModule("parts");
  const [app] = await db.select().from(partnerApplications).where(eq(partnerApplications.id, id));
  if (!app || app.status !== "pending") return { ok: false, error: "이미 처리된 신청입니다. 화면을 새로고침해 주세요." };
  if (app.userId) {
    const { error } = await createSupabaseAdmin().auth.admin.deleteUser(app.userId);
    if (error && !/not.?found/i.test(error.message)) return { ok: false, error: `로그인 계정을 지우지 못했습니다: ${error.message}` };
  }
  await db
    .update(partnerApplications)
    .set({ status: "rejected", userId: null, rejectReason: reason.trim().slice(0, 300) || null, reviewedAt: new Date(), reviewedBy: me.id })
    .where(eq(partnerApplications.id, id));
  PATHS.forEach((p) => revalidatePath(p));
  return { ok: true, message: "거절했습니다. 신청자의 로그인 계정은 지웠습니다." };
}
