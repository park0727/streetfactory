import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, salesLines, salesOrders } from "@/db/schema";
import { supplyOf } from "@/lib/vat";
import type { SaleInput } from "./schema";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** 전표번호 채번 (트랜잭션 안에서) */
export async function nextDocNo(tx: Tx, prefix: string, date: string) {
  const year = Number(date.slice(0, 4));
  const r = await tx.execute(sql`select public.fn_next_seq(${prefix}, ${year}) as n`);
  const n = Number((r as unknown as { n: number }[])[0]?.n ?? (r as unknown as { rows?: { n: number }[] }).rows?.[0]?.n);
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** 입력 단가(부가세 포함) → 저장할 라인 값: 공급가 + 포함가 */
export const lineValues = (orderId: number, lines: SaleInput["lines"]) =>
  lines.map((l, i) => ({ orderId, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPrice: supplyOf(Math.round(l.unitPrice)), unitPriceGross: Math.round(l.unitPrice), unitCost: 0 }));

/** 전표 총액 (부가세 포함) */
export const saleTotal = (lines: SaleInput["lines"]) => lines.reduce((a, l) => a + l.qty * Math.round(l.unitPrice), 0);

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
      vatApplied: true, // 판매가는 모두 부가세 포함
      taxInvoiceIssued: d.taxInvoiceIssued,
      taxInvoiceDate: d.taxInvoiceIssued ? d.docDate : null,
      dueDate: d.terms === "credit" ? (d.dueDate ?? null) : null,
      createdBy: userId,
    })
    .returning({ id: salesOrders.id });
  await tx.insert(salesLines).values(lineValues(o.id, d.lines));
  await tx.execute(sql`select public.fn_post_sale(${o.id})`);
  if (d.terms === "immediate") {
    const total = saleTotal(d.lines);
    if (total > 0) await tx.insert(payments).values({ salesOrderId: o.id, partnerId: d.partnerId, paidAt: d.docDate, amount: total, method: d.method, memo: "출고 시 즉시 결제", createdBy: userId });
  }
  return { id: o.id, docNo };
}
