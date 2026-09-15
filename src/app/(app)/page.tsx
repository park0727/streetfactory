import Link from "next/link";
import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { inboundLines, inboundOrders, salesLines, salesOrders, vInventory, vSalesSettlement } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addDays, monthStart, todayKST, yearStart } from "@/lib/dates";
import { krw, num, pct } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { Kpi } from "@/components/kpi";
import { StockStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonthlyChart, CategoryChart } from "./dashboard-charts";

export const metadata = { title: "대시보드" };

export default async function DashboardPage() {
  const me = await requireUser();
  const today = todayKST();
  const mStart = monthStart(today);
  const yStart = yearStart(today);
  const twelveAgo = addDays(mStart, -335).slice(0, 8) + "01"; // 11개월 전 1일

  const salesAgg = (from: string) =>
    db
      .select({
        amount: sql<number>`coalesce(sum(${salesLines.qty} * ${salesLines.unitPrice}), 0)::numeric`,
        profit: sql<number>`coalesce(sum(${salesLines.qty} * (${salesLines.unitPrice} - ${salesLines.unitCost})), 0)::numeric`,
        orders: sql<number>`count(distinct ${salesOrders.id})::int`,
      })
      .from(salesLines)
      .innerJoin(salesOrders, eq(salesOrders.id, salesLines.orderId))
      .where(and(gte(salesOrders.docDate, from), lte(salesOrders.docDate, today)));

  // 동시 쿼리는 5개 이하로 (풀 크기)
  const [[stock], [month], [year], monthly, categories] = await Promise.all([
    db
      .select({
        value: sql<number>`coalesce(sum(greatest(${vInventory.qty}, 0) * ${vInventory.avgCost}), 0)::numeric`,
        alerts: sql<number>`count(*) filter (where ${vInventory.stockStatus} <> 'ok')::int`,
        out: sql<number>`count(*) filter (where ${vInventory.stockStatus} = 'out')::int`,
        items: sql<number>`count(*)::int`,
      })
      .from(vInventory)
      .where(ne(vInventory.status, "discontinued")),
    salesAgg(mStart),
    salesAgg(yStart),
    db
      .select({
        month: sql<string>`to_char(${salesOrders.docDate}, 'YYYY-MM')`,
        amount: sql<number>`coalesce(sum(${salesLines.qty} * ${salesLines.unitPrice}), 0)::numeric`,
        profit: sql<number>`coalesce(sum(${salesLines.qty} * (${salesLines.unitPrice} - ${salesLines.unitCost})), 0)::numeric`,
      })
      .from(salesLines)
      .innerJoin(salesOrders, eq(salesOrders.id, salesLines.orderId))
      .where(gte(salesOrders.docDate, twelveAgo))
      .groupBy(sql`to_char(${salesOrders.docDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${salesOrders.docDate}, 'YYYY-MM')`),
    db
      .select({ name: vInventory.categoryName, value: sql<number>`coalesce(sum(greatest(${vInventory.qty}, 0) * ${vInventory.avgCost}), 0)::numeric` })
      .from(vInventory)
      .where(ne(vInventory.status, "discontinued"))
      .groupBy(vInventory.categoryName)
      .orderBy(desc(sql`sum(greatest(${vInventory.qty}, 0) * ${vInventory.avgCost})`)),
  ]);
  const [countries, alerts, [recv]] = await Promise.all([
    db
      .select({
        country: sql<string>`coalesce(${inboundOrders.country}, '미지정')`,
        orders: sql<number>`count(distinct ${inboundOrders.id})::int`,
        qty: sql<number>`coalesce(sum(${inboundLines.qty}), 0)::int`,
        cost: sql<number>`coalesce(sum(${inboundLines.qty} * ${inboundLines.landedUnitCost}), 0)::numeric`,
      })
      .from(inboundOrders)
      .leftJoin(inboundLines, eq(inboundLines.orderId, inboundOrders.id))
      .where(and(gte(inboundOrders.docDate, yStart), lte(inboundOrders.docDate, today)))
      .groupBy(inboundOrders.country)
      .orderBy(desc(sql`sum(${inboundLines.qty} * ${inboundLines.landedUnitCost})`)),
    db
      .select({ id: vInventory.id, code: vInventory.code, name: vInventory.name, spec: vInventory.spec, qty: vInventory.qty, safetyStock: vInventory.safetyStock, stockStatus: vInventory.stockStatus })
      .from(vInventory)
      .where(and(ne(vInventory.status, "discontinued"), ne(vInventory.stockStatus, "ok")))
      .orderBy(asc(sql`case ${vInventory.stockStatus} when 'out' then 0 else 1 end`), asc(sql`${vInventory.qty} - ${vInventory.safetyStock}`))
      .limit(8),
    db
      .select({
        balance: sql<number>`coalesce(sum(greatest(${vSalesSettlement.balance}, 0)), 0)::numeric`,
        orders: sql<number>`count(*) filter (where ${vSalesSettlement.balance} > 0)::int`,
        overdue: sql<number>`count(*) filter (where ${vSalesSettlement.balance} > 0 and ${vSalesSettlement.dueDate} < ${today})::int`,
      })
      .from(vSalesSettlement),
  ]);

  // 12개월을 빈 달 포함해 채운다
  const months: { month: string; amount: number; profit: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const hit = monthly.find((m) => m.month === key);
    months.push({ month: key, amount: Number(hit?.amount ?? 0), profit: Number(hit?.profit ?? 0) });
  }
  const yearMargin = Number(year.amount) > 0 ? (Number(year.profit) / Number(year.amount)) * 100 : 0;
  const totalCountryCost = countries.reduce((a, c) => a + Number(c.cost), 0);

  return (
    <>
      <PageHeader title="대시보드" description={`${me.name}님, ${today} 기준 경영 현황입니다.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="총 재고 평가액" value={krw(stock.value)} sub={`${num(stock.items)}종 · 평균원가 기준`} />
        <Kpi label="당월 매출" value={krw(month.amount)} sub={`${num(month.orders)}건 · ${mStart.slice(5, 7)}월`} />
        <Kpi label="누적 매출 (올해)" value={krw(year.amount)} sub={`${num(year.orders)}건`} />
        <Kpi label="매출이익 (올해)" value={krw(year.profit)} sub={`평균 마진율 ${pct(yearMargin)}`} tone={Number(year.profit) < 0 ? "critical" : undefined} />
        <Link href="/inventory?stock=alert" className="contents">
          <Kpi label="발주 필요 품목" value={num(stock.alerts)} unit="종" sub={`품절 ${num(stock.out)}종 · 눌러서 보기`} tone={stock.out > 0 ? "critical" : stock.alerts > 0 ? "warn" : undefined} />
        </Link>
        <Link href="/ledger/sales?pay=unpaid&from=2000-01-01" className="contents">
          <Kpi label="총 미수금" value={krw(recv.balance)} sub={`미수 전표 ${num(recv.orders)}건 · 기한 경과 ${num(recv.overdue)}건`} tone={recv.overdue > 0 ? "critical" : Number(recv.balance) > 0 ? "warn" : undefined} />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Panel className="p-4">
          <ChartHead title="월별 매출액 · 매출이익" sub="최근 12개월, 공급가액 기준" />
          <MonthlyChart data={months} />
        </Panel>
        <Panel className="p-4">
          <ChartHead title="카테고리별 재고 평가액" sub="현재재고 × 평균원가" />
          {categories.length === 0 ? <Empty /> : <CategoryChart data={categories.map((c) => ({ name: c.name, value: Number(c.value) }))} />}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <ChartHead title="수입국가별 입고 현황" sub={`올해 · 총 ${krw(totalCountryCost)}`} inline />
            <Link href="/ledger/inbound" className="text-[12px] text-steel hover:text-foreground hover:underline">입고 원장</Link>
          </div>
          {countries.length === 0 ? (
            <Empty />
          ) : (
            <Table className="text-[13px]">
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="th-label">국가</TableHead>
                  <TableHead className="th-label w-[80px] text-right">입고 건수</TableHead>
                  <TableHead className="th-label w-[80px] text-right">수량</TableHead>
                  <TableHead className="th-label w-[140px] text-right">총 수입비용</TableHead>
                  <TableHead className="th-label w-[120px] text-right">비중</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c) => {
                  const share = totalCountryCost > 0 ? (Number(c.cost) / totalCountryCost) * 100 : 0;
                  return (
                    <TableRow key={c.country}>
                      <TableCell className="font-medium">{c.country}</TableCell>
                      <TableCell className="tabular text-right">{num(c.orders)}</TableCell>
                      <TableCell className="tabular text-right">{num(c.qty)}</TableCell>
                      <TableCell className="tabular text-right">{krw(c.cost)}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-sm bg-muted"><span className="block h-full bg-chart-1" style={{ width: `${share}%` }} /></span>
                          <span className="tabular w-11 text-steel">{pct(share, 0)}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <ChartHead title="발주 필요 품목" sub="품절 → 부족 순, 상위 8개" inline />
            <Link href="/inventory?stock=alert" className="inline-flex items-center gap-1 text-[12px] text-steel hover:text-foreground hover:underline">
              전체 보기 <ArrowRight className="size-3" />
            </Link>
          </div>
          {alerts.length === 0 ? (
            <Empty text="안전재고 미달 품목이 없습니다." />
          ) : (
            <ul className="divide-y">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-[13px]">
                  <span className="code w-[100px] shrink-0 text-[12.5px]">{a.code}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {a.name}
                    {a.spec && <span className="ml-1.5 text-[12px] text-steel">{a.spec}</span>}
                  </span>
                  <span className="tabular shrink-0 text-steel">
                    <b className={a.stockStatus === "out" ? "text-status-critical" : "text-status-warn"}>{num(a.qty)}</b> / {num(a.safetyStock)}
                  </span>
                  <StockStatusBadge status={a.stockStatus} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function ChartHead({ title, sub, inline }: { title: string; sub?: string; inline?: boolean }) {
  return (
    <div className={inline ? "" : "mb-3"}>
      <p className="text-[13.5px] font-semibold">{title}</p>
      {sub && <p className="text-[12px] text-steel">{sub}</p>}
    </div>
  );
}
function Empty({ text = "아직 데이터가 없습니다." }: { text?: string }) {
  return <p className="px-4 py-8 text-center text-[13px] text-steel">{text}</p>;
}
