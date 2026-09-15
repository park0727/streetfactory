"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payments, salesOrders, vSalesSettlement } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  id: z.coerce.number().int().optional(),
  orderId: z.coerce.number().int().positive(),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "입금일 형식이 올바르지 않습니다."),
  amount: z.coerce.number().int().positive("금액은 1원 이상이어야 합니다."),
  method: z.enum(["cash", "transfer", "card", "other"]),
  memo: z.string().trim().max(200).optional(),
});

function paths(orderId: number) {
  return ["/ledger/sales", `/ledger/sales/${orderId}`, "/ledger/partners", "/partners", "/"];
}

/** 수금 등록·수정. 잔액을 넘는 금액은 막는다 (과입금은 별도 전표나 메모로). */
export async function savePayment(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireModule("parts");
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v));
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, orderId, paidAt, amount, method, memo } = r.data;

  const [o] = await db.select({ partnerId: salesOrders.partnerId, docNo: salesOrders.docNo }).from(salesOrders).where(eq(salesOrders.id, orderId));
  if (!o) return { ok: false, error: "전표를 찾을 수 없습니다." };
  const [st] = await db.select({ total: vSalesSettlement.amountTotal, paid: vSalesSettlement.paid }).from(vSalesSettlement).where(eq(vSalesSettlement.orderId, orderId));
  let already = Number(st?.paid ?? 0);
  if (id) {
    const [cur] = await db.select({ amount: payments.amount, salesOrderId: payments.salesOrderId }).from(payments).where(eq(payments.id, id));
    if (!cur || cur.salesOrderId !== orderId) return { ok: false, error: "수금 내역을 찾을 수 없습니다." };
    already -= Number(cur.amount);
  }
  const balance = Number(st?.total ?? 0) - already;
  if (amount > balance) return { ok: false, error: `잔액(₩${balance.toLocaleString()})보다 큰 금액은 등록할 수 없습니다.` };

  if (id) await db.update(payments).set({ paidAt, amount, method, memo: memo ?? null }).where(eq(payments.id, id));
  else await db.insert(payments).values({ salesOrderId: orderId, partnerId: o.partnerId, paidAt, amount, method, memo: memo ?? null, createdBy: me.id });
  paths(orderId).forEach((p) => revalidatePath(p));
  const left = balance - amount;
  return { ok: true, message: left <= 0 ? `${o.docNo} 완납 처리되었습니다.` : `수금을 저장했습니다. 남은 미수 ₩${left.toLocaleString()}` };
}

export async function deletePayment(id: number): Promise<ActionResult> {
  await requireModule("parts");
  const [cur] = await db.select({ salesOrderId: payments.salesOrderId }).from(payments).where(eq(payments.id, id));
  if (!cur) return { ok: false, error: "수금 내역을 찾을 수 없습니다." };
  await db.delete(payments).where(eq(payments.id, id));
  paths(cur.salesOrderId).forEach((p) => revalidatePath(p));
  return { ok: true, message: "수금 내역을 삭제했습니다. 잔액이 다시 미수로 잡힙니다." };
}

/** 세금계산서 발행 여부·일자 */
export async function setTaxInvoice(orderId: number, issued: boolean, date?: string): Promise<ActionResult> {
  await requireModule("parts");
  await db
    .update(salesOrders)
    .set({ taxInvoiceIssued: issued, taxInvoiceDate: issued ? (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)) : null })
    .where(eq(salesOrders.id, orderId));
  paths(orderId).forEach((p) => revalidatePath(p));
  return { ok: true, message: issued ? "세금계산서 발행으로 표시했습니다." : "세금계산서 미발행으로 바꿨습니다." };
}
