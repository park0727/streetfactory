import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Trash2 } from "lucide-react";
import { db } from "@/db";
import { inboundLines, inboundOrders, parts, profiles, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { krw, num } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteInbound } from "../actions";

export const metadata = { title: "입고 전표" };

export default async function InboundDetailPage({ params }: PageProps<"/ledger/inbound/[id]">) {
  const me = await requireModule("parts");
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [o] = await db
    .select({
      id: inboundOrders.id,
      docNo: inboundOrders.docNo,
      docDate: inboundOrders.docDate,
      country: inboundOrders.country,
      currency: inboundOrders.currency,
      exchangeRate: inboundOrders.exchangeRate,
      dutyAmount: inboundOrders.dutyAmount,
      extraCost: inboundOrders.extraCost,
      shippingMethod: inboundOrders.shippingMethod,
      customsStatus: inboundOrders.customsStatus,
      memo: inboundOrders.memo,
      createdAt: inboundOrders.createdAt,
      supplierName: suppliers.name,
      createdByName: profiles.name,
    })
    .from(inboundOrders)
    .leftJoin(suppliers, eq(suppliers.id, inboundOrders.supplierId))
    .leftJoin(profiles, eq(profiles.id, inboundOrders.createdBy))
    .where(eq(inboundOrders.id, orderId));
  if (!o) notFound();

  const lines = await db
    .select({ id: inboundLines.id, lineNo: inboundLines.lineNo, code: parts.code, name: parts.name, spec: parts.spec, qty: inboundLines.qty, fx: inboundLines.unitPriceFx, krw: inboundLines.unitPriceKrw, alloc: inboundLines.allocatedCost, landed: inboundLines.landedUnitCost })
    .from(inboundLines)
    .innerJoin(parts, eq(parts.id, inboundLines.partId))
    .where(eq(inboundLines.orderId, orderId))
    .orderBy(asc(inboundLines.lineNo));

  const qty = lines.reduce((a, l) => a + l.qty, 0);
  const goods = lines.reduce((a, l) => a + l.qty * l.krw, 0);
  const overhead = o.dutyAmount + o.extraCost;
  const total = lines.reduce((a, l) => a + l.qty * l.landed, 0);

  return (
    <>
      <PageHeader
        eyebrow="입고 원장"
        title={o.docNo}
        description={`${o.docDate} · ${o.supplierName ?? "공급사 미지정"} · ${o.country ?? ""} · ${o.currency} ${o.currency === "KRW" ? "" : "@ " + num(o.exchangeRate, 4)}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ledger/inbound">
                <ArrowLeft /> 목록
              </Link>
            </Button>
            {me.role === "admin" && (
              <ConfirmButton
                action={deleteInbound.bind(null, o.id)}
                title={`${o.docNo} 삭제`}
                description="전표를 지우고 입고 수량을 되돌리며 해당 부품의 평균원가를 다시 계산합니다. 이미 판매된 라인의 원가 스냅샷은 바뀌지 않습니다."
                confirmLabel="삭제"
                destructive
                variant="outline"
                size="sm"
                className="text-status-critical"
              >
                <Trash2 /> 전표 삭제
              </ConfirmButton>
            )}
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
                <TableHead className="th-label w-[110px] text-right">단가 ({o.currency})</TableHead>
                <TableHead className="th-label w-[100px] text-right">원화단가</TableHead>
                <TableHead className="th-label w-[100px] text-right">배분 부대비</TableHead>
                <TableHead className="th-label w-[110px] text-right">실질원가/개</TableHead>
                <TableHead className="th-label w-[120px] text-right">라인 합계</TableHead>
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
                  <TableCell className="tabular text-right">{num(l.fx, 2)}</TableCell>
                  <TableCell className="tabular text-right">{krw(l.krw)}</TableCell>
                  <TableCell className="tabular text-right text-steel">{krw(l.alloc)}</TableCell>
                  <TableCell className="tabular text-right font-medium">{krw(l.landed)}</TableCell>
                  <TableCell className="tabular text-right">{krw(l.qty * l.landed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <div className="space-y-4">
          <Panel className="p-4">
            <p className="th-label mb-2">합계</p>
            <dl className="space-y-1.5 text-[13px]">
              <Row k="총 수량" v={`${num(qty)}개`} />
              <Row k="물품대 (원화)" v={krw(goods)} />
              <Row k="관세" v={krw(o.dutyAmount)} />
              <Row k="부대비용" v={krw(o.extraCost)} />
              <Row k="관세 + 부대비용" v={krw(overhead)} muted />
              <Row k="총 입고비용" v={krw(total)} strong />
            </dl>
          </Panel>
          <Panel className="p-4">
            <p className="th-label mb-2">전표 정보</p>
            <dl className="space-y-1.5 text-[13px]">
              <Row k="운송방식" v={o.shippingMethod ?? "—"} />
              <Row k="통관상태" v={o.customsStatus === "cleared" ? "통관 완료" : "통관 대기"} />
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
