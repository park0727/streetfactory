"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { shopSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const t = (n: number) => z.string().trim().max(n).optional();
const schema = z.object({
  companyName: z.string().trim().min(1, "상호를 입력하세요.").max(60),
  ceoName: t(30),
  bizNo: z.string().trim().transform((v) => v.replace(/\D/g, "")).refine((v) => v === "" || v.length === 10, "사업자등록번호는 숫자 10자리입니다.").optional(),
  mailOrderNo: t(60),
  phone: t(40),
  address: t(200),
  bankName: t(30),
  bankAccount: t(60),
  bankHolder: t(40),
  orderNotice: t(1000),
  shopNotice: t(500),
});

export async function saveShopSettings(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const r = schema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const v = Object.fromEntries(Object.entries(r.data).map(([k, x]) => [k, x === "" || x === undefined ? null : x])) as Record<string, string | null>;
  const values = { ...v, companyName: r.data.companyName, updatedAt: new Date() };
  await db.insert(shopSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: shopSettings.id, set: values });
  ["/settings/shop", "/shop", "/shop/orders"].forEach((p) => revalidatePath(p));
  return { ok: true, message: "주문 화면 설정을 저장했습니다." };
}
