import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { parts, partners, profiles, salesLines, salesOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { krw, num, pct, withVat } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LedgerRowActions } from "../../row-actions";

export const metadata = { title: "판매 전표" };

export default async function SaleDetailPage({ params }: PageProps<"/ledger/sales/[id]">) {
  await requireModule("parts");
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [o] = await db
    .select({
      id: salesOrders.id,
      docNo: salesOrders.docNo,
      docDate: salesOrders.docDate,
      channel: salesOrders.channel,
      memo: salesOrders.memo,
      createdAt: salesOrders.createdAt,
      partnerId: partners.id,
      partnerName: partners.name,
      partnerCode: partners.code,
      createdByName: profiles.name,
    })
    .from(salesOrders)
    .innerJoin(partners, eq(partners.id, salesOrders.partnerId))
    .leftJoin(profiles, eq(profiles.id, salesOrders.createdBy))
    .where(eq(salesOrders.id, orderId));
  if (!o) notFound();

  const lines = await db
    .select({ id: salesLines.id, lineNo: salesLines.lineNo, code: parts.code, name: parts.name, spec: parts.spec, qty: salesLines.qty, unitPrice: salesLines.unitPrice, unitCost: salesLines.unitCost })
    .from(salesLines)
    .innerJoin(parts, eq(parts.id, salesLines.partId))
    .where(eq(salesLines.orderId, orderId))
    .orderBy(asc(salesLines.lineNo));

  const amount = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const cost = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
  const profit = amount - cost;

  return (
    <>
      <PageHeader
        eyebrow="판매 원장"
        title={o.docNo}
        description={`${o.docDate} · ${o.partnerName} · ${o.channel ?? "채널 미지정"}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ledger/sales">
                <ArrowLeft /> 목록
              </Link>
            </Button>
            <LedgerRowActions kind="sales" id={o.id} docNo={o.docNo} size="sm" withLabels />
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Panel className="overflow-hidden">
          <Table className="text-[13px]">
            <TableHeader className="bg-muted/70">
              <TableRow className="hover:bg-transparent">
                <TableHead className="th-label w-[40px] text-right">#</TableHead>
                <TableHead className="th-label w-[120px]">부품코드</TableHead>
                <TableHead className="th-label">부품명</TableHead>
                <TableHead className="th-label w-[60px] text-right">수량</TableHead>
                <TableHead className="th-label w-[110px] text-right">출고단가</TableHead>
                <TableHead className="th-label w-[110px] text-right">적용원가</TableHead>
                <TableHead className="th-label w-[120px] text-right">매출액</TableHead>
                <TableHead className="th-label w-[110px] text-right">이익</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="tabular text-right text-steel">{l.lineNo}</TableCell>
                  <TableCell className="code">{l.code}</TableCell>
                  <TableCell>
                    {l.name}
                    {l.spec && <span className="ml-1.5 text-[12px] text-steel">{l.spec}</span>}
                  </TableCell>
                  <TableCell className="tabular text-right">{num(l.qty)}</TableCell>
                  <TableCell className="tabular text-right">{krw(l.unitPrice)}</TableCell>
                  <TableCell className="tabular text-right text-steel">{krw(l.unitCost)}</TableCell>
                  <TableCell className="tabular text-right font-medium">{krw(l.qty * l.unitPrice)}</TableCell>
                  <TableCell className="tabular text-right">{krw(l.qty * (l.unitPrice - l.unitCost))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-4">
            <p className="th-label mb-2">합계 (공급가액)</p>
            <dl className="space-y-1.5 text-[13px]">
              <Row k="매출액" v={krw(amount)} strong />
              <Row k="부가세 포함" v={krw(withVat(amount))} muted />
              <Row k="원가 (스냅샷)" v={krw(cost)} />
              <Row k="매출이익" v={krw(profit)} strong />
              <Row k="마진율" v={pct(amount > 0 ? (profit / amount) * 100 : 0)} />
            </dl>
          </Panel>
          <Panel className="p-4">
            <p className="th-label mb-2">전표 정보</p>
            <dl className="space-y-1.5 text-[13px]">
              <Row k="거래처" v={`${o.partnerName} (${o.partnerCode})`} />
              <Row k="채널" v={o.channel ?? "—"} />
              <Row k="등록자" v={o.createdByName ?? "—"} />
              <Row k="등록 시각" v={o.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} />
              {o.memo && <Row k="메모" v={o.memo} />}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-steel">{k}</dt>
      <dd className={`tabular text-right ${strong ? "font-semibold" : ""} ${muted ? "text-steel" : ""}`}>{v}</dd>
    </div>
  );
}
