"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { salesOrders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

/** 판매 전표 삭제 (관리자). 재고이동을 되돌리고 전표·라인을 지운다. */
export async function deleteSale(id: number): Promise<ActionResult> {
  await requireAdmin();
  const [o] = await db.select({ docNo: salesOrders.docNo }).from(salesOrders).where(eq(salesOrders.id, id));
  if (!o) return { ok: false, error: "전표를 찾을 수 없습니다." };
  await db.transaction(async (tx) => {
    await tx.execute(sql`select public.fn_unpost_sale(${id})`);
    await tx.delete(salesOrders).where(eq(salesOrders.id, id));
  });
  for (const p of ["/ledger/sales", "/ledger/partners", "/inventory", "/partners", "/entry", "/"]) revalidatePath(p);
  return { ok: true, message: `${o.docNo} 를 삭제하고 재고를 되돌렸습니다.` };
}
