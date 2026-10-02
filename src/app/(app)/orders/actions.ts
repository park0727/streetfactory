"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { vInventory, webOrderLines, webOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { firstIssue, type ActionResult } from "@/lib/action-result";
import { insertSale } from "../entry/sale-core";

const PATHS = ["/orders", "/shop/orders", "/entry", "/inventory", "/ledger/sales", "/partners", "/"];

const shipSchema = z.object({
  orderId: z.number().int().positive(),
  docDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(z.object({ lineId: z.number().int().positive(), qty: z.number().int().min(0) })).min(1),
});

/**
 * 온라인 주문 출고 처리: (수량 조정 반영) → 판매 전표 생성(외상/미수) → 주문 상태 '출고 완료'.
 * 수량 0 인 라인은 빼고 출고한다.
 */
export async function shipWebOrder(input: z.infer<typeof shipSchema>): Promise<ActionResult<{ salesOrderId: number; docNo: string }>> {
  const me = await requireModule("parts");
  const r = shipSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  const [o] = await db
    .select({ id: webOrders.id, orderNo: webOrders.orderNo, status: webOrders.status, partnerId: webOrders.partnerId, vatApplied: webOrders.vatApplied, memo: webOrders.memo })
    .from(webOrders)
    .where(eq(webOrders.id, d.orderId));
  if (!o) return { ok: false, error: "주문을 찾을 수 없습니다." };
  if (o.status !== "pending") return { ok: false, error: "이미 처리된 주문입니다." };
  const lines = await db.select().from(webOrderLines).where(eq(webOrderLines.orderId, o.id));
  const qtyById = new Map(d.lines.map((l) => [l.lineId, l.qty]));
  const final = lines.map((l) => ({ ...l, qty: qtyById.get(l.id) ?? l.qty })).filter((l) => l.qty > 0);
  if (final.length === 0) return { ok: false, error: "출고할 수량이 없습니다. 전부 품절이면 '주문 취소'를 눌러 주세요." };

  // 실제 재고 확인
  const need = new Map<number, number>();
  for (const l of final) need.set(l.partId, (need.get(l.partId) ?? 0) + l.qty);
  const stocks = await db.select({ id: vInventory.id, code: vInventory.code, qty: vInventory.qty }).from(vInventory).where(inArray(vInventory.id, [...need.keys()]));
  const short = stocks.filter((s) => (need.get(s.id) ?? 0) > s.qty);
  if (short.length) return { ok: false, error: `재고가 부족합니다: ${short.map((s) => `${s.code} (재고 ${s.qty}, 출고 ${need.get(s.id)})`).join(", ")}. 수량을 줄이거나 입고 후 처리하세요.` };

  try {
    const res = await db.transaction(async (tx) => {
      const locked = await tx
        .update(webOrders)
        .set({ status: "shipped", processedBy: me.id, processedAt: new Date() })
        .where(and(eq(webOrders.id, o.id), eq(webOrders.status, "pending")))
        .returning({ id: webOrders.id });
      if (locked.length === 0) throw new Error("ALREADY");
      // 조정된 수량을 주문 라인에도 남긴다 (0 은 삭제)
      for (const l of lines) {
        const q = qtyById.get(l.id) ?? l.qty;
        if (q === 0) await tx.delete(webOrderLines).where(eq(webOrderLines.id, l.id));
        else if (q !== l.qty) await tx.update(webOrderLines).set({ qty: q }).where(eq(webOrderLines.id, l.id));
      }
      const sale = await insertSale(
        tx,
        {
          docDate: d.docDate,
          partnerId: o.partnerId,
          channel: "온라인 주문",
          memo: [`온라인 주문 ${o.orderNo}`, o.memo].filter(Boolean).join(" · "),
          allowNegative: false,
          terms: "credit", // 계좌 입금 전이므로 미수로 잡고, 입금되면 전표 상세에서 수금 등록
          method: "transfer",
          vatApplied: o.vatApplied,
          taxInvoiceIssued: false,
          lines: final.sort((a, b) => a.lineNo - b.lineNo).map((l) => ({ partId: l.partId, qty: l.qty, unitPrice: l.unitPrice })),
        },
        me.id,
      );
      await tx.update(webOrders).set({ salesOrderId: sale.id }).where(eq(webOrders.id, o.id));
      return sale;
    });
    PATHS.forEach((x) => revalidatePath(x));
    return { ok: true, message: `${o.orderNo} 를 출고 처리했습니다. 판매 전표 ${res.docNo} 가 만들어졌습니다.`, data: { salesOrderId: res.id, docNo: res.docNo } };
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY") return { ok: false, error: "이미 처리된 주문입니다." };
    throw e;
  }
}

export async function cancelWebOrder(id: number, reason: string): Promise<ActionResult> {
  const me = await requireModule("parts");
  const res = await db
    .update(webOrders)
    .set({ status: "cancelled", cancelReason: reason.trim().slice(0, 200) || "판매자 취소", processedBy: me.id, processedAt: new Date() })
    .where(and(eq(webOrders.id, id), eq(webOrders.status, "pending")))
    .returning({ orderNo: webOrders.orderNo });
  if (res.length === 0) return { ok: false, error: "이미 처리된 주문입니다." };
  PATHS.forEach((x) => revalidatePath(x));
  return { ok: true, message: `${res[0].orderNo} 주문을 취소했습니다.` };
}

