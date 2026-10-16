import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { customerAccounts, partners, parts, profiles, salesOrders, vInventory, webOrderLines, webOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { OrderStatusChip } from "../../../shop/order-status";
import { ProcessOrder } from "./process-order";

export const metadata = { title: "온라인 주문" };

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  await requireModule("parts");
  const orderId = Number((await params).id);
  if (!Number.isInteger(orderId)) notFound();
  const [o] = await db
    .select({
      id: webOrders.id,
      orderNo: webOrders.orderNo,
      status: webOrders.status,
      vatApplied: webOrders.vatApplied,
      memo: webOrders.memo,
      cancelReason: webOrders.cancelReason,
      createdAt: webOrders.createdAt,
      processedAt: webOrders.processedAt,
      salesOrderId: webOrders.salesOrderId,
      salesDocNo: salesOrders.docNo,
      partnerName: partners.name,
      partnerPhone: partners.phone,
      partnerAddress: partners.address,
      customerName: customerAccounts.name,
      processedByName: profiles.name,
    })
    .from(webOrders)
    .innerJoin(partners, eq(partners.id, webOrders.partnerId))
    .leftJoin(customerAccounts, eq(customerAccounts.id, webOrders.customerId))
    .leftJoin(salesOrders, eq(salesOrders.id, webOrders.salesOrderId))
    .leftJoin(profiles, eq(profiles.id, webOrders.processedBy))
    .where(eq(webOrders.id, orderId));
  if (!o) notFound();
  const lines = await db
    .select({ id: webOrderLines.id, lineNo: webOrderLines.lineNo, code: parts.code, name: parts.name, spec: parts.spec, qty: webOrderLines.qty, unitPrice: webOrderLines.unitPrice, stock: vInventory.qty })
    .from(webOrderLines)
    .innerJoin(parts, eq(parts.id, webOrderLines.partId))
    .innerJoin(vInventory, eq(vInventory.id, webOrderLines.partId))
    .where(eq(webOrderLines.orderId, orderId))
    .orderBy(asc(webOrderLines.lineNo));

  return (
    <>
      <PageHeader
        eyebrow="온라인 주문"
        title={o.orderNo}
        description={`${o.partnerName}${o.customerName ? ` · 주문자 ${o.customerName}` : ""} · ${o.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">
              <ArrowLeft /> 목록
            </Link>
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
        <OrderStatusChip s={o.status} />
        {o.partnerPhone && <span className="text-steel">연락처 {o.partnerPhone}</span>}
        {o.partnerAddress && <span className="text-steel">· {o.partnerAddress}</span>}
        {o.status === "shipped" && o.salesOrderId && (
          <Link href={`/ledger/sales/${o.salesOrderId}`} className="font-medium text-primary hover:underline">
            판매 전표 {o.salesDocNo} 보기 →
          </Link>
        )}
        {o.status !== "pending" && o.processedByName && <span className="text-steel">· 처리 {o.processedByName}</span>}
      </div>
      {o.memo && <p className="mb-3 rounded-md border bg-card px-3 py-2 text-[13px]"><span className="text-steel">요청 사항</span> {o.memo}</p>}
      {o.status === "cancelled" && <p className="mb-3 rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2 text-[13px] text-status-critical">취소 사유: {o.cancelReason}</p>}
      <ProcessOrder orderId={o.id} orderNo={o.orderNo} pending={o.status === "pending"} vatApplied={o.vatApplied} today={todayKST()} lines={lines} />
    </>
  );
}
