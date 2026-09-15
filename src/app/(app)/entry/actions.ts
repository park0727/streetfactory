"use server";
import { revalidatePath } from "next/cache";
import { and, asc, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { inboundLines, inboundOrders, parts, payments, salesLines, salesOrders, vInventory, vSalesSettlement } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireModule } from "@/lib/auth";
import { firstIssue, type ActionResult } from "@/lib/action-result";
import { saleSchema, inboundSchema, type SaleInput, type InboundInput } from "./schema";

export type PartHit = {
  id: number;
  code: string;
  name: string;
  spec: string | null;
  qty: number;
  retailPrice: number;
  avgCost: number;
  standardCost: number;
  stockStatus: "ok" | "low" | "out";
  status: "active" | "paused" | "discontinued";
  supplierId: number | null;
};

/** 부품 검색 (코드·이름·호환기종). 코드 정확 일치는 맨 위. 단종은 제외. */
export async function searchParts(q: string, opts?: { includeDiscontinued?: boolean }): Promise<PartHit[]> {
  await requireModule("parts");
  const term = q.trim();
  const conds = [term ? or(ilike(vInventory.code, `%${term}%`), ilike(vInventory.name, `%${term}%`), ilike(vInventory.spec, `%${term}%`))! : undefined, opts?.includeDiscontinued ? undefined : ne(vInventory.status, "discontinued")].filter(Boolean);
  const exact = sql`case when upper(${vInventory.code}) = upper(${term}) then 0 else 1 end`;
  const rows = await db
    .select({
      id: vInventory.id,
      code: vInventory.code,
      name: vInventory.name,
      spec: vInventory.spec,
      qty: vInventory.qty,
      retailPrice: vInventory.retailPrice,
      avgCost: vInventory.avgCost,
      standardCost: vInventory.standardCost,
      stockStatus: vInventory.stockStatus,
      status: vInventory.status,
      supplierId: vInventory.supplierId,
    })
    .from(vInventory)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(exact), asc(vInventory.code))
    .limit(20);
  return rows;
}

async function nextDocNo(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], prefix: string, date: string) {
  const year = Number(date.slice(0, 4));
  const r = await tx.execute(sql`select public.fn_next_seq(${prefix}, ${year}) as n`);
  const n = Number((r as unknown as { n: number }[])[0]?.n ?? (r as unknown as { rows?: { n: number }[] }).rows?.[0]?.n);
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** 재고 검사. editingOrderId 가 있으면 그 전표가 이미 차감한 수량은 가용재고로 되돌려 계산한다. */
async function checkStock(d: SaleInput, role: string, editingOrderId?: number): Promise<string | null> {
  const need = new Map<number, number>();
  for (const l of d.lines) need.set(l.partId, (need.get(l.partId) ?? 0) + l.qty);
  const stocks = await db.select({ id: vInventory.id, code: vInventory.code, qty: vInventory.qty }).from(vInventory).where(inArray(vInventory.id, [...need.keys()]));
  if (stocks.length !== need.size) return "존재하지 않는 부품이 포함되어 있습니다.";
  const held = new Map<number, number>();
  if (editingOrderId) {
    const old = await db.select({ partId: salesLines.partId, qty: salesLines.qty }).from(salesLines).where(eq(salesLines.orderId, editingOrderId));
    for (const o of old) held.set(o.partId, (held.get(o.partId) ?? 0) + o.qty);
  }
  const short = stocks.filter((s) => (need.get(s.id) ?? 0) > s.qty + (held.get(s.id) ?? 0));
  if (short.length && !(role === "admin" && d.allowNegative)) {
    const msg = short.map((s) => `${s.code} (가용 ${s.qty + (held.get(s.id) ?? 0)}, 출고 ${need.get(s.id)})`).join(", ");
    return `재고가 부족합니다: ${msg}. ${role === "admin" ? "'재고 부족해도 출고' 를 켜면 진행할 수 있습니다." : "관리자만 재고 초과 출고를 할 수 있습니다."}`;
  }
  return null;
}

/** 판매/출고 등록 → 전표 + 라인 → fn_post_sale (원가 스냅샷, 재고 차감) */
export async function createSale(input: SaleInput): Promise<ActionResult<{ docNo: string }>> {
  const me = await requireModule("parts");
  const r = saleSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  const stockError = await checkStock(d, me.role);
  if (stockError) return { ok: false, error: stockError };

  const docNo = await db.transaction(async (tx) => {
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
        createdBy: me.id,
      })
      .returning({ id: salesOrders.id });
    await tx.insert(salesLines).values(d.lines.map((l, i) => ({ orderId: o.id, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPrice: Math.round(l.unitPrice), unitCost: 0 })));
    await tx.execute(sql`select public.fn_post_sale(${o.id})`);
    // 즉시 결제: 총액(부가세 반영)을 출고일에 수금 처리
    if (d.terms === "immediate") {
      const supply = d.lines.reduce((a, l) => a + l.qty * Math.round(l.unitPrice), 0);
      const total = d.vatApplied ? Math.round(supply * 1.1) : supply;
      if (total > 0) await tx.insert(payments).values({ salesOrderId: o.id, partnerId: d.partnerId, paidAt: d.docDate, amount: total, method: d.method, memo: "출고 시 즉시 결제", createdBy: me.id });
    }
    return docNo;
  });

  revalidatePath("/entry");
  revalidatePath("/inventory");
  revalidatePath("/ledger/sales");
  revalidatePath("/ledger/partners");
  revalidatePath("/partners");
  revalidatePath("/");
  return { ok: true, message: `${docNo} 출고를 등록했습니다.`, data: { docNo } };
}

/**
 * 판매 전표 수정. 전표번호는 유지한다.
 * 재고이동을 되돌리고(fn_unpost_sale) 라인을 갈아 끼운 뒤 다시 확정한다(fn_post_sale).
 * 원가 스냅샷은 재확정 시점의 평균원가로 새로 잡힌다.
 */
export async function updateSale(orderId: number, input: SaleInput): Promise<ActionResult<{ docNo: string }>> {
  const me = await requireModule("parts");
  const r = saleSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  const [o] = await db.select({ id: salesOrders.id, docNo: salesOrders.docNo, taxInvoiceDate: salesOrders.taxInvoiceDate }).from(salesOrders).where(eq(salesOrders.id, orderId));
  if (!o) return { ok: false, error: "전표를 찾을 수 없습니다." };
  const stockError = await checkStock(d, me.role, orderId);
  if (stockError) return { ok: false, error: stockError };
  // 이미 받은 돈보다 총액이 작아지면 안 된다
  const [st] = await db.select({ paid: vSalesSettlement.paid }).from(vSalesSettlement).where(eq(vSalesSettlement.orderId, orderId));
  const supply = d.lines.reduce((a, l) => a + l.qty * Math.round(l.unitPrice), 0);
  const total = d.vatApplied ? Math.round(supply * 1.1) : supply;
  if (st && Number(st.paid) > total) return { ok: false, error: `이미 수금한 금액(₩${Number(st.paid).toLocaleString()})이 새 총액(₩${total.toLocaleString()})보다 큽니다. 수금 내역을 먼저 정리하세요.` };

  await db.transaction(async (tx) => {
    await tx.execute(sql`select public.fn_unpost_sale(${orderId})`);
    await tx.delete(salesLines).where(eq(salesLines.orderId, orderId));
    await tx
      .update(salesOrders)
      .set({
        docDate: d.docDate,
        partnerId: d.partnerId,
        channel: d.channel ?? null,
        memo: d.memo ?? null,
        vatApplied: d.vatApplied,
        taxInvoiceIssued: d.taxInvoiceIssued,
        taxInvoiceDate: d.taxInvoiceIssued ? (o.taxInvoiceDate ?? d.docDate) : null,
        dueDate: d.dueDate ?? null,
      })
      .where(eq(salesOrders.id, orderId));
    // 거래처가 바뀌면 수금의 거래처도 따라간다
    await tx.update(payments).set({ partnerId: d.partnerId }).where(eq(payments.salesOrderId, orderId));
    await tx.insert(salesLines).values(d.lines.map((l, i) => ({ orderId, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPrice: Math.round(l.unitPrice), unitCost: 0 })));
    await tx.execute(sql`select public.fn_post_sale(${orderId})`);
  });
  for (const p of ["/entry", "/inventory", "/ledger/sales", `/ledger/sales/${orderId}`, "/ledger/partners", "/partners", "/"]) revalidatePath(p);
  return { ok: true, message: `${o.docNo} 를 수정했습니다.`, data: { docNo: o.docNo } };
}

/** 수입/입고 등록 → 전표 + 라인 → fn_post_inbound (배분·실질원가·평균원가) */
export async function createInbound(input: InboundInput): Promise<ActionResult<{ docNo: string }>> {
  const me = await requireModule("parts");
  const r = inboundSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  const ids = [...new Set(d.lines.map((l) => l.partId))];
  const found = await db.select({ id: parts.id }).from(parts).where(inArray(parts.id, ids));
  if (found.length !== ids.length) return { ok: false, error: "존재하지 않는 부품이 포함되어 있습니다." };

  const docNo = await db.transaction(async (tx) => {
    const docNo = await nextDocNo(tx, "INB", d.docDate);
    const [o] = await tx
      .insert(inboundOrders)
      .values({
        docNo,
        docDate: d.docDate,
        supplierId: d.supplierId,
        country: d.country ?? null,
        currency: d.currency,
        exchangeRate: d.exchangeRate,
        dutyAmount: Math.round(d.dutyAmount),
        extraCost: Math.round(d.extraCost),
        shippingMethod: d.shippingMethod ?? null,
        customsStatus: d.customsStatus,
        memo: d.memo ?? null,
        createdBy: me.id,
      })
      .returning({ id: inboundOrders.id });
    await tx.insert(inboundLines).values(
      d.lines.map((l, i) => ({ orderId: o.id, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPriceFx: l.unitPriceFx, unitPriceKrw: 0, allocatedCost: 0, landedUnitCost: 0 })),
    );
    await tx.execute(sql`select public.fn_post_inbound(${o.id})`);
    return docNo;
  });

  revalidatePath("/entry");
  revalidatePath("/inventory");
  revalidatePath("/ledger/inbound");
  revalidatePath("/");
  return { ok: true, message: `${docNo} 입고를 확정했습니다.`, data: { docNo } };
}

/**
 * 입고 전표 수정. 전표번호 유지. 되돌리기(fn_unpost_inbound, 평균원가 재계산) → 라인 교체 → 재확정.
 * 이미 판매된 라인의 원가 스냅샷은 바뀌지 않는다.
 */
export async function updateInbound(orderId: number, input: InboundInput): Promise<ActionResult<{ docNo: string }>> {
  await requireModule("parts");
  const r = inboundSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  const [o] = await db.select({ id: inboundOrders.id, docNo: inboundOrders.docNo }).from(inboundOrders).where(eq(inboundOrders.id, orderId));
  if (!o) return { ok: false, error: "전표를 찾을 수 없습니다." };
  const ids = [...new Set(d.lines.map((l) => l.partId))];
  const found = await db.select({ id: parts.id }).from(parts).where(inArray(parts.id, ids));
  if (found.length !== ids.length) return { ok: false, error: "존재하지 않는 부품이 포함되어 있습니다." };

  await db.transaction(async (tx) => {
    await tx.execute(sql`select public.fn_unpost_inbound(${orderId})`);
    await tx.delete(inboundLines).where(eq(inboundLines.orderId, orderId));
    await tx
      .update(inboundOrders)
      .set({
        docDate: d.docDate,
        supplierId: d.supplierId,
        country: d.country ?? null,
        currency: d.currency,
        exchangeRate: d.exchangeRate,
        dutyAmount: Math.round(d.dutyAmount),
        extraCost: Math.round(d.extraCost),
        shippingMethod: d.shippingMethod ?? null,
        customsStatus: d.customsStatus,
        memo: d.memo ?? null,
      })
      .where(eq(inboundOrders.id, orderId));
    await tx.insert(inboundLines).values(d.lines.map((l, i) => ({ orderId, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPriceFx: l.unitPriceFx, unitPriceKrw: 0, allocatedCost: 0, landedUnitCost: 0 })));
    await tx.execute(sql`select public.fn_post_inbound(${orderId})`);
  });
  for (const p of ["/entry", "/inventory", "/ledger/inbound", `/ledger/inbound/${orderId}`, "/parts", "/"]) revalidatePath(p);
  return { ok: true, message: `${o.docNo} 를 수정했습니다.`, data: { docNo: o.docNo } };
}

/** 최근 판매·입고 5건 (하단 피드). 원장과 같은 기준: 전표일자 내림차순, 같은 날이면 나중 전표가 위.
 *  주의: 단일 테이블 select 안의 서브쿼리에서 바깥 컬럼은 `sales_orders.id` 처럼 테이블명을 직접 쓴다 (drizzle 이 `"id"` 로만 렌더링해 서브쿼리 컬럼과 충돌). */
export async function recentFeed() {
  const [sales, inbound] = await Promise.all([
    db
      .select({
        id: salesOrders.id,
        docNo: salesOrders.docNo,
        docDate: salesOrders.docDate,
        partner: sql<string>`(select name from partners p where p.id = sales_orders.partner_id)`,
        lines: sql<number>`(select count(*)::int from sales_lines l where l.order_id = sales_orders.id)`,
        amount: sql<number>`(select coalesce(sum(l.qty * l.unit_price), 0)::numeric from sales_lines l where l.order_id = sales_orders.id)`,
        createdAt: salesOrders.createdAt,
      })
      .from(salesOrders)
      .orderBy(sql`${salesOrders.docDate} desc, ${salesOrders.id} desc`)
      .limit(5),
    db
      .select({
        id: inboundOrders.id,
        docNo: inboundOrders.docNo,
        docDate: inboundOrders.docDate,
        supplier: sql<string>`(select name from suppliers s where s.id = inbound_orders.supplier_id)`,
        lines: sql<number>`(select count(*)::int from inbound_lines l where l.order_id = inbound_orders.id)`,
        cost: sql<number>`(select coalesce(sum(l.qty * l.landed_unit_cost), 0)::numeric from inbound_lines l where l.order_id = inbound_orders.id)`,
        createdAt: inboundOrders.createdAt,
      })
      .from(inboundOrders)
      .orderBy(sql`${inboundOrders.docDate} desc, ${inboundOrders.id} desc`)
      .limit(5),
  ]);
  const now = Date.now();
  // KST 기준 오늘
  const today = new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return { sales, inbound, now, today };
}
export type RecentFeed = Awaited<ReturnType<typeof recentFeed>>;
