"use server";
import { revalidatePath } from "next/cache";
import { and, asc, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { inboundLines, inboundOrders, parts, salesLines, salesOrders, vInventory } from "@/db/schema";
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

/** 판매/출고 등록 → 전표 + 라인 → fn_post_sale (원가 스냅샷, 재고 차감) */
export async function createSale(input: SaleInput): Promise<ActionResult<{ docNo: string }>> {
  const me = await requireModule("parts");
  const r = saleSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;

  // 같은 부품이 여러 라인이면 합쳐서 재고 검사
  const need = new Map<number, number>();
  for (const l of d.lines) need.set(l.partId, (need.get(l.partId) ?? 0) + l.qty);
  const stocks = await db.select({ id: vInventory.id, code: vInventory.code, qty: vInventory.qty, status: vInventory.status }).from(vInventory).where(inArray(vInventory.id, [...need.keys()]));
  if (stocks.length !== need.size) return { ok: false, error: "존재하지 않는 부품이 포함되어 있습니다." };
  const short = stocks.filter((s) => (need.get(s.id) ?? 0) > s.qty);
  if (short.length) {
    if (!(me.role === "admin" && d.allowNegative)) {
      const msg = short.map((s) => `${s.code} (재고 ${s.qty}, 출고 ${need.get(s.id)})`).join(", ");
      return { ok: false, error: `재고가 부족합니다: ${msg}. ${me.role === "admin" ? "'재고 부족해도 출고' 를 켜면 진행할 수 있습니다." : "관리자만 재고 초과 출고를 할 수 있습니다."}` };
    }
  }

  const docNo = await db.transaction(async (tx) => {
    const docNo = await nextDocNo(tx, "SLS", d.docDate);
    const [o] = await tx
      .insert(salesOrders)
      .values({ docNo, docDate: d.docDate, partnerId: d.partnerId, channel: d.channel ?? null, memo: d.memo ?? null, createdBy: me.id })
      .returning({ id: salesOrders.id });
    await tx.insert(salesLines).values(d.lines.map((l, i) => ({ orderId: o.id, lineNo: i + 1, partId: l.partId, qty: l.qty, unitPrice: Math.round(l.unitPrice), unitCost: 0 })));
    await tx.execute(sql`select public.fn_post_sale(${o.id})`);
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

/** 최근 판매·입고 5건 (하단 피드) */
export async function recentFeed() {
  const [sales, inbound] = await Promise.all([
    db
      .select({
        id: salesOrders.id,
        docNo: salesOrders.docNo,
        docDate: salesOrders.docDate,
        partner: sql<string>`(select name from partners p where p.id = ${salesOrders.partnerId})`,
        lines: sql<number>`(select count(*)::int from sales_lines l where l.order_id = ${salesOrders.id})`,
        amount: sql<number>`(select coalesce(sum(l.qty * l.unit_price), 0)::numeric from sales_lines l where l.order_id = ${salesOrders.id})`,
        createdAt: salesOrders.createdAt,
      })
      .from(salesOrders)
      .orderBy(sql`${salesOrders.createdAt} desc`)
      .limit(5),
    db
      .select({
        id: inboundOrders.id,
        docNo: inboundOrders.docNo,
        docDate: inboundOrders.docDate,
        supplier: sql<string>`(select name from suppliers s where s.id = ${inboundOrders.supplierId})`,
        lines: sql<number>`(select count(*)::int from inbound_lines l where l.order_id = ${inboundOrders.id})`,
        cost: sql<number>`(select coalesce(sum(l.qty * l.landed_unit_cost), 0)::numeric from inbound_lines l where l.order_id = ${inboundOrders.id})`,
        createdAt: inboundOrders.createdAt,
      })
      .from(inboundOrders)
      .orderBy(sql`${inboundOrders.createdAt} desc`)
      .limit(5),
  ]);
  const now = Date.now();
  // KST 기준 오늘
  const today = new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return { sales, inbound, now, today };
}
export type RecentFeed = Awaited<ReturnType<typeof recentFeed>>;
