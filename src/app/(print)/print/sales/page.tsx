import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { parts, partners, salesLines, salesOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { str } from "@/lib/query-params";
import { PrintSheet } from "./print-sheet";

export const metadata = { title: "출고증 인쇄" };

export default async function PrintSalesPage({ searchParams }: PageProps<"/print/sales">) {
  await requireModule("parts");
  const sp = await searchParams;
  const ids = str(sp, "ids")
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 50);
  if (ids.length === 0) notFound();

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
    .where(inArray(salesOrders.id, ids));
  if (orders.length === 0) notFound();

  const lines = await db
    .select({ orderId: salesLines.orderId, lineNo: salesLines.lineNo, code: parts.code, name: parts.name, spec: parts.spec, qty: salesLines.qty, unitPrice: salesLines.unitPrice })
    .from(salesLines)
    .innerJoin(parts, eq(parts.id, salesLines.partId))
    .where(inArray(salesLines.orderId, ids))
    .orderBy(asc(salesLines.orderId), asc(salesLines.lineNo));

  // 요청한 순서대로
  const byId = new Map(orders.map((o) => [o.id, o]));
  const docs = ids
    .filter((id) => byId.has(id))
    .map((id) => ({ ...byId.get(id)!, lines: lines.filter((l) => l.orderId === id) }));

  return <PrintSheet docs={docs} />;
}
