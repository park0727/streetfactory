import Link from "next/link";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { FileUp } from "lucide-react";
import { db } from "@/db";
import { inboundLines, inboundOrders, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { int, str, PAGE_SIZE } from "@/lib/query-params";
import { addDays, isDate, todayKST } from "@/lib/dates";
import { krw, num } from "@/lib/format";
import { PageHeader, Panel, EmptyState } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InboundToolbar } from "./toolbar";
import { LedgerRowActions } from "../row-actions";

export const metadata = { title: "입고 원장" };

export default async function InboundLedgerPage({ searchParams }: PageProps<"/ledger/inbound">) {
  await requireModule("parts");
  const sp = await searchParams;
  const today = todayKST();
  const from = isDate(str(sp, "from")) ? str(sp, "from") : addDays(today, -179);
  const to = isDate(str(sp, "to")) ? str(sp, "to") : today;
  const supplierId = int(sp, "supplier", 0);
  const q = str(sp, "q");
  const page = int(sp, "page", 1);

  const c: SQL[] = [gte(inboundOrders.docDate, from), lte(inboundOrders.docDate, to)];
  if (supplierId) c.push(eq(inboundOrders.supplierId, supplierId));
  if (q) c.push(or(ilike(inboundOrders.docNo, `%${q}%`), ilike(suppliers.name, `%${q}%`))!);
  const where = and(...c);

  const agg = db
    .select({
      orderId: inboundLines.orderId,
      lines: sql<number>`count(*)::int`.as("lines"),
      qty: sql<number>`sum(${inboundLines.qty})::int`.as("qty"),
      goods: sql<number>`sum(${inboundLines.qty} * ${inboundLines.unitPriceKrw})::numeric`.as("goods"),
      total: sql<number>`sum(${inboundLines.qty} * ${inboundLines.landedUnitCost})::numeric`.as("total"),
    })
    .from(inboundLines)
    .groupBy(inboundLines.orderId)
    .as("agg");

  const [rows, [tot], slist] = await Promise.all([
    db
      .select({
        id: inboundOrders.id,
        docNo: inboundOrders.docNo,
        docDate: inboundOrders.docDate,
        supplierName: suppliers.name,
        country: inboundOrders.country,
        currency: inboundOrders.currency,
        exchangeRate: inboundOrders.exchangeRate,
        dutyAmount: inboundOrders.dutyAmount,
        extraCost: inboundOrders.extraCost,
        shippingMethod: inboundOrders.shippingMethod,
        customsStatus: inboundOrders.customsStatus,
        lines: sql<number>`coalesce(${agg.lines}, 0)`,
        qty: sql<number>`coalesce(${agg.qty}, 0)`,
        goods: sql<number>`coalesce(${agg.goods}, 0)`,
        total: sql<number>`coalesce(${agg.total}, 0)`,
      })
      .from(inboundOrders)
      .leftJoin(suppliers, eq(suppliers.id, inboundOrders.supplierId))
      .leftJoin(agg, eq(agg.orderId, inboundOrders.id))
      .where(where)
      .orderBy(desc(inboundOrders.docDate), desc(inboundOrders.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${agg.total}), 0)::numeric`, qty: sql<number>`coalesce(sum(${agg.qty}), 0)::int` })
      .from(inboundOrders)
      .leftJoin(suppliers, eq(suppliers.id, inboundOrders.supplierId))
      .leftJoin(agg, eq(agg.orderId, inboundOrders.id))
      .where(where),
    db.select({ id: suppliers.id, name: suppliers.name, country: suppliers.country }).from(suppliers).orderBy(asc(suppliers.name)),
  ]);

  return (
    <>
      <PageHeader
        title="입고 원장"
        description="모든 해외 수입/입고 전표. 총 입고비용은 물품대 + 관세 + 부대비용입니다."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/ledger/inbound/import">
              <FileUp /> 엑셀로 입고 등록
            </Link>
          </Button>
        }
      />
      <InboundToolbar suppliers={slist} from={from} to={to} />
      <p className="mt-3 mb-3 text-[13px] text-steel">
        {from} ~ {to} · 전표 <b className="text-foreground">{num(tot.n)}</b>건 · 입고 수량 <b className="text-foreground">{num(tot.qty)}</b>개 · 총 입고비용 <b className="text-foreground">{krw(tot.total)}</b>
      </p>
      <Panel className="overflow-hidden">
        <Table className="text-[13px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
            <TableRow className="hover:bg-transparent">
              <TableHead className="th-label w-[140px]">입고번호</TableHead>
              <TableHead className="th-label w-[100px]">입고일</TableHead>
              <TableHead className="th-label">공급사</TableHead>
              <TableHead className="th-label w-[70px]">국가</TableHead>
              <TableHead className="th-label w-[110px]">통화 / 환율</TableHead>
              <TableHead className="th-label w-[60px] text-right">품목</TableHead>
              <TableHead className="th-label w-[60px] text-right">수량</TableHead>
              <TableHead className="th-label w-[120px] text-right">물품대</TableHead>
              <TableHead className="th-label w-[110px] text-right">관세+부대</TableHead>
              <TableHead className="th-label w-[130px] text-right">총 입고비용</TableHead>
              <TableHead className="th-label w-[80px]">운송</TableHead>
              <TableHead className="th-label w-[90px]">통관</TableHead>
              <TableHead className="w-[72px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="p-0">
                  <EmptyState title="해당 기간에 입고 전표가 없습니다" />
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="code">
                  <Link href={`/ledger/inbound/${r.id}`} className="hover:underline">{r.docNo}</Link>
                </TableCell>
                <TableCell className="tabular">{r.docDate}</TableCell>
                <TableCell className="font-medium">{r.supplierName ?? "—"}</TableCell>
                <TableCell className="text-steel">{r.country ?? "—"}</TableCell>
                <TableCell className="tabular text-steel">{r.currency} {r.currency === "KRW" ? "" : num(r.exchangeRate, 2)}</TableCell>
                <TableCell className="tabular text-right">{num(r.lines)}</TableCell>
                <TableCell className="tabular text-right">{num(r.qty)}</TableCell>
                <TableCell className="tabular text-right">{krw(r.goods)}</TableCell>
                <TableCell className="tabular text-right text-steel">{krw(r.dutyAmount + r.extraCost)}</TableCell>
                <TableCell className="tabular text-right font-medium">{krw(r.total)}</TableCell>
                <TableCell className="text-steel">{r.shippingMethod ?? "—"}</TableCell>
                <TableCell>{r.customsStatus === "cleared" ? <Badge variant="outline" className="border-status-ok/40 text-status-ok">통관 완료</Badge> : <Badge variant="outline" className="border-status-warn/40 text-status-warn">통관 대기</Badge>}</TableCell>
                <TableCell className="text-right"><LedgerRowActions kind="inbound" id={r.id} docNo={r.docNo} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t px-4 py-2.5">
          <Pagination page={page} pageSize={PAGE_SIZE} total={tot.n} />
        </div>
      </Panel>
    </>
  );
}
