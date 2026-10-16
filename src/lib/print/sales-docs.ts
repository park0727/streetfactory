import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { parts, partners, salesLines, salesOrders } from "@/db/schema";

/** 출고증·거래명세서용 전표 데이터. partnerId 를 주면 그 거래처 전표만 (고객용). 원가·이익은 조회하지 않는다. */
export async function loadPrintDocs(ids: number[], partnerId?: number) {
  const where = partnerId ? and(inArray(salesOrders.id, ids), eq(salesOrders.partnerId, partnerId)) : inArray(salesOrders.id, ids);
  const orders = await db
    .select({
      id: salesOrders.id,
      docNo: salesOrders.docNo,
      docDate: salesOrders.docDate,
      channel: salesOrders.channel,
      memo: salesOrders.memo,
      vatApplied: salesOrders.vatApplied,
      dueDate: salesOrders.dueDate,
      partnerName: partners.name,
      partnerCode: partners.code,
      contactName: partners.contactName,
      phone: partners.phone,
      address: partners.address,
      bizNo: partners.bizNo,
    })
    .from(salesOrders)
    .innerJoin(partners, eq(partners.id, salesOrders.partnerId))
    .where(where);
  if (orders.length === 0) return [];
  const okIds = orders.map((o) => o.id);
  const lines = await db
    .select({ orderId: salesLines.orderId, lineNo: salesLines.lineNo, code: parts.code, name: parts.name, spec: parts.spec, qty: salesLines.qty, unitPrice: salesLines.unitPrice })
    .from(salesLines)
    .innerJoin(parts, eq(parts.id, salesLines.partId))
    .where(inArray(salesLines.orderId, okIds))
    .orderBy(asc(salesLines.orderId), asc(salesLines.lineNo));
  const byId = new Map(orders.map((o) => [o.id, o]));
  return ids.filter((id) => byId.has(id)).map((id) => ({ ...byId.get(id)!, lines: lines.filter((l) => l.orderId === id) }));
}

export const parseIds = (raw: string) =>
  raw
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 50);

