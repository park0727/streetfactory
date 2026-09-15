import "server-only";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { inboundLines, inboundOrders, parts, partners, salesLines, salesOrders, suppliers } from "@/db/schema";

/** 판매 라인 원장 (거래처 원장·판매 엑셀 공용) */
export function salesLineWhere(f: { from?: string; to?: string; partnerId?: number; q?: string }) {
  const c: SQL[] = [];
  if (f.from) c.push(gte(salesOrders.docDate, f.from));
  if (f.to) c.push(lte(salesOrders.docDate, f.to));
  if (f.partnerId) c.push(eq(salesOrders.partnerId, f.partnerId));
  if (f.q) c.push(or(ilike(salesOrders.docNo, `%${f.q}%`), ilike(parts.code, `%${f.q}%`), ilike(parts.name, `%${f.q}%`))!);
  return c.length ? and(...c) : undefined;
}

export const salesLineSelect = {
  lineId: salesLines.id,
  orderId: salesOrders.id,
  docNo: salesOrders.docNo,
  docDate: salesOrders.docDate,
  partnerId: partners.id,
  partnerName: partners.name,
  channel: salesOrders.channel,
  partCode: parts.code,
  partName: parts.name,
  spec: parts.spec,
  qty: salesLines.qty,
  unitPrice: salesLines.unitPrice,
  unitCost: salesLines.unitCost,
  amount: sql<number>`(${salesLines.qty} * ${salesLines.unitPrice})::numeric`,
  profit: sql<number>`(${salesLines.qty} * (${salesLines.unitPrice} - ${salesLines.unitCost}))::numeric`,
};

export function salesLineQuery(where: SQL | undefined, sort: "date_desc" | "date_asc" | "amount_desc" = "date_desc") {
  const order = sort === "date_asc" ? [asc(salesOrders.docDate), asc(salesOrders.id), asc(salesLines.lineNo)] : sort === "amount_desc" ? [desc(sql`${salesLines.qty} * ${salesLines.unitPrice}`)] : [desc(salesOrders.docDate), desc(salesOrders.id), asc(salesLines.lineNo)];
  return db
    .select(salesLineSelect)
    .from(salesLines)
    .innerJoin(salesOrders, eq(salesOrders.id, salesLines.orderId))
    .innerJoin(partners, eq(partners.id, salesOrders.partnerId))
    .innerJoin(parts, eq(parts.id, salesLines.partId))
    .where(where)
    .orderBy(...order);
}

export function salesLineSummary(where: SQL | undefined) {
  return db
    .select({
      orders: sql<number>`count(distinct ${salesOrders.id})::int`,
      lines: sql<number>`count(*)::int`,
      qty: sql<number>`coalesce(sum(${salesLines.qty}), 0)::int`,
      amount: sql<number>`coalesce(sum(${salesLines.qty} * ${salesLines.unitPrice}), 0)::numeric`,
      profit: sql<number>`coalesce(sum(${salesLines.qty} * (${salesLines.unitPrice} - ${salesLines.unitCost})), 0)::numeric`,
    })
    .from(salesLines)
    .innerJoin(salesOrders, eq(salesOrders.id, salesLines.orderId))
    .innerJoin(partners, eq(partners.id, salesOrders.partnerId))
    .innerJoin(parts, eq(parts.id, salesLines.partId))
    .where(where);
}

/** 입고 라인 원장 */
export function inboundLineWhere(f: { from?: string; to?: string; supplierId?: number; q?: string }) {
  const c: SQL[] = [];
  if (f.from) c.push(gte(inboundOrders.docDate, f.from));
  if (f.to) c.push(lte(inboundOrders.docDate, f.to));
  if (f.supplierId) c.push(eq(inboundOrders.supplierId, f.supplierId));
  if (f.q) c.push(or(ilike(inboundOrders.docNo, `%${f.q}%`), ilike(parts.code, `%${f.q}%`), ilike(parts.name, `%${f.q}%`))!);
  return c.length ? and(...c) : undefined;
}

export const inboundLineSelect = {
  lineId: inboundLines.id,
  orderId: inboundOrders.id,
  docNo: inboundOrders.docNo,
  docDate: inboundOrders.docDate,
  supplierName: suppliers.name,
  country: inboundOrders.country,
  currency: inboundOrders.currency,
  exchangeRate: inboundOrders.exchangeRate,
  shippingMethod: inboundOrders.shippingMethod,
  customsStatus: inboundOrders.customsStatus,
  partCode: parts.code,
  partName: parts.name,
  qty: inboundLines.qty,
  unitPriceFx: inboundLines.unitPriceFx,
  unitPriceKrw: inboundLines.unitPriceKrw,
  allocatedCost: inboundLines.allocatedCost,
  landedUnitCost: inboundLines.landedUnitCost,
  lineCost: sql<number>`(${inboundLines.qty} * ${inboundLines.landedUnitCost})::numeric`,
};

export function inboundLineQuery(where: SQL | undefined) {
  return db
    .select(inboundLineSelect)
    .from(inboundLines)
    .innerJoin(inboundOrders, eq(inboundOrders.id, inboundLines.orderId))
    .leftJoin(suppliers, eq(suppliers.id, inboundOrders.supplierId))
    .innerJoin(parts, eq(parts.id, inboundLines.partId))
    .where(where)
    .orderBy(desc(inboundOrders.docDate), desc(inboundOrders.id), asc(inboundLines.lineNo));
}
