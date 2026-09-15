"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partners, salesOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().trim().min(1, "거래처명을 입력하세요.").max(100),
  type: z.enum(["dealer", "service_center", "direct_store", "online_mall", "other"]).default("dealer"),
  bizNo: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || v.length === 10, "사업자등록번호는 숫자 10자리입니다 (예: 123-45-67890).")
    .optional(),
  contactName: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(100).optional(),
  address: z.string().trim().max(200).optional(),
  memo: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
});

export async function savePartner(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireModule("parts");
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v));
  raw.isActive = fd.get("isActive") === "true"; // 체크 해제 시 값이 실리지 않으므로 명시적으로 판정
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, ...v } = r.data;
  const values = { name: v.name, type: v.type, bizNo: v.bizNo || null, contactName: v.contactName ?? null, phone: v.phone ?? null, email: v.email ?? null, address: v.address ?? null, memo: v.memo ?? null, isActive: v.isActive };
  try {
    if (id) await db.update(partners).set(values).where(eq(partners.id, id));
    else {
      await db.transaction(async (tx) => {
        const r = await tx.execute(sql`select public.fn_next_seq('P', 0) as n`);
        const n = Number((r as unknown as { n: number }[])[0]?.n ?? (r as unknown as { rows?: { n: number }[] }).rows?.[0]?.n);
        await tx.insert(partners).values({ ...values, code: `P-${String(n).padStart(4, "0")}` });
      });
    }
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  revalidatePath("/partners");
  revalidatePath("/entry");
  return { ok: true, message: "저장했습니다." };
}

/** 거래처 삭제. 출고 이력이 있으면 원장 무결성 때문에 삭제 대신 '거래 중지' 를 안내한다. */
export async function deletePartner(id: number): Promise<ActionResult> {
  await requireModule("parts");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(salesOrders).where(eq(salesOrders.partnerId, id));
  if (n > 0) return { ok: false, error: `출고 전표 ${n}건이 이 거래처에 연결되어 있어 삭제할 수 없습니다. 대신 수정에서 '거래 중' 을 해제하세요.` };
  await db.delete(partners).where(eq(partners.id, id));
  revalidatePath("/partners");
  revalidatePath("/entry");
  return { ok: true, message: "거래처를 삭제했습니다." };
}
