import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { inboundLines, inboundOrders, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { partHitsByIds } from "../../../../entry/queries";
import { EditInboundClient } from "./edit-client";

export const metadata = { title: "입고 전표 수정" };

export default async function EditInboundPage({ params }: PageProps<"/ledger/inbound/[id]/edit">) {
  await requireModule("parts");
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const [o] = await db.select().from(inboundOrders).where(eq(inboundOrders.id, orderId));
  if (!o) notFound();
  const [lines, ss] = await Promise.all([
    db.select({ partId: inboundLines.partId, qty: inboundLines.qty, unitPriceFx: inboundLines.unitPriceFx }).from(inboundLines).where(eq(inboundLines.orderId, orderId)).orderBy(asc(inboundLines.lineNo)),
    db.select({ id: suppliers.id, name: suppliers.name, country: suppliers.country }).from(suppliers).orderBy(asc(suppliers.name)),
  ]);
  const hits = await partHitsByIds(lines.map((l) => l.partId));
  const initial = {
    orderId: o.id,
    docNo: o.docNo,
    docDate: o.docDate,
    supplierId: o.supplierId,
    currency: o.currency,
    exchangeRate: o.exchangeRate,
    dutyAmount: o.dutyAmount,
    extraCost: o.extraCost,
    shippingMethod: o.shippingMethod,
    customsStatus: o.customsStatus,
    memo: o.memo,
    lines: lines.filter((l) => hits.has(l.partId)).map((l) => ({ part: hits.get(l.partId)!, qty: l.qty, unitPriceFx: l.unitPriceFx })),
  };
  return (
    <>
      <PageHeader
        eyebrow="입고 원장"
        title={`${o.docNo} 수정`}
        description="저장하면 기존 입고를 되돌리고 새 내용으로 다시 확정합니다. 부대비용 배분·실질원가·평균원가가 다시 계산됩니다."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ledger/inbound/${o.id}`}>
              <ArrowLeft /> 전표로
            </Link>
          </Button>
        }
      />
      <Panel className="p-4">
        <EditInboundClient suppliers={ss} today={todayKST()} initial={initial} />
      </Panel>
    </>
  );
}
