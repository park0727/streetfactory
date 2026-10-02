import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, salesLines, salesOrders } from "@/db/schema";
import type { SaleInput } from "./schema";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** 전표번호 채번 (트랜잭션 안에서) */
export async function nextDocNo(tx: Tx, prefix: string, date: string) {
  const year = Number(date.slice(0, 4));
  const r = await tx.execute(sql`select public.fn_next_seq(${prefix}, ${year}) as n`);
  const n = Number((r as unknown as { n: number }[])[0]?.n ?? (r as unknown as { rows?: { n: number }[] }).rows?.[0]?.n);
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** 판매 전표 + 라인 + 확정(fn_post_sale) + 즉시 결제 수금. 검증·재고 검사는 호출자가 한다. */
export async function insertSale(tx: Tx, d: SaleInput, userId: string): Promise<{ id: number; docNo: string }> {
  const docNo = await nextDocNo(tx, "SLS", d.docDate);
  const [o] = await tx
    .insert(salesOrders)
    .values({
      docNo,
      docDate: d.docDate,
      partnerId: d.partnerId,
      channel: d.channel ?? null,
      memo: d.memo ?? null,
      vatApplied: d.vatApplied,
      taxInvoiceIssued: d.taxInvoiceIssued,
      taxInvoiceDate: d.taxInvoiceIssued ? d.docDate : null,
      dueDate: d.terms === "credit" ? (d.dueDate ?? null) : null,
      createdBy: userId,
    })
    .returning({ id: salesOrders.id });
  await tx.insert(salesLines).values(d.lines.map((l, i) => ({ orderId: o.id, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPrice: Math.round(l.unitPrice), unitCost: 0 })));
  await tx.execute(sql`select public.fn_post_sale(${o.id})`);
  if (d.terms === "immediate") {
    const supply = d.lines.reduce((a, l) => a + l.qty * Math.round(l.unitPrice), 0);
    const total = d.vatApplied ? Math.round(supply * 1.1) : supply;
    if (total > 0) await tx.insert(payments).values({ salesOrderId: o.id, partnerId: d.partnerId, paidAt: d.docDate, amount: total, method: d.method, memo: "출고 시 즉시 결제", createdBy: userId });
  }
  return { id: o.id, docNo };
}
