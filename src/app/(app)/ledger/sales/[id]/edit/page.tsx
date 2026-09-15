import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { partners, salesChannels, salesLines, salesOrders, vSalesSettlement } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { partHitsByIds } from "../../../../entry/queries";
import { EditSaleClient } from "./edit-client";

export const metadata = { title: "판매 전표 수정" };

export default async function EditSalePage({ params }: PageProps<"/ledger/sales/[id]/edit">) {
  const me = await requireModule("parts");
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const [o] = await db.select().from(salesOrders).where(eq(salesOrders.id, orderId));
  if (!o) notFound();
  const [lines, ps, cs] = await Promise.all([
    db.select({ partId: salesLines.partId, qty: salesLines.qty, unitPrice: salesLines.unitPrice }).from(salesLines).where(eq(salesLines.orderId, orderId)).orderBy(asc(salesLines.lineNo)),
    db.select({ id: partners.id, name: partners.name, type: partners.type, code: partners.code, defaultTerms: partners.defaultTerms, defaultVat: partners.defaultVat }).from(partners).orderBy(asc(partners.name)),
    db.select({ name: salesChannels.name }).from(salesChannels).orderBy(asc(salesChannels.sortOrder)),
  ]);
  const hits = await partHitsByIds(lines.map((l) => l.partId));
  const [st] = await db.select({ paid: vSalesSettlement.paid }).from(vSalesSettlement).where(eq(vSalesSettlement.orderId, orderId));
  const initial = {
    orderId: o.id,
    docNo: o.docNo,
    docDate: o.docDate,
    partnerId: o.partnerId,
    channel: o.channel,
    memo: o.memo,
    vatApplied: o.vatApplied,
    taxInvoiceIssued: o.taxInvoiceIssued,
    dueDate: o.dueDate,
    paid: Number(st?.paid ?? 0),
    lines: lines.filter((l) => hits.has(l.partId)).map((l) => ({ part: hits.get(l.partId)!, qty: l.qty, unitPrice: l.unitPrice })),
  };
  return (
    <>
      <PageHeader
        eyebrow="판매 원장"
        title={`${o.docNo} 수정`}
        description="저장하면 기존 재고 차감을 되돌리고 새 내용으로 다시 확정합니다. 원가는 재확정 시점 평균원가로 새로 잡힙니다."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ledger/sales/${o.id}`}>
              <ArrowLeft /> 전표로
            </Link>
          </Button>
        }
      />
      <Panel className="p-4">
        <EditSaleClient partners={ps} channels={cs.map((c) => c.name)} isAdmin={me.role === "admin"} today={todayKST()} initial={initial} />
      </Panel>
    </>
  );
}
