import Link from "next/link";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { partners, salesOrders, webOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { str } from "@/lib/query-params";
import { krw } from "@/lib/format";
import { PageHeader, Panel, EmptyState } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusChip } from "../../shop/order-status";
import { StatusTabs } from "./status-tabs";

export const metadata = { title: "온라인 주문" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  await requireModule("parts");
  const sp = await searchParams;
  const status = (["pending", "shipped", "cancelled", "all"].includes(str(sp, "s")) ? str(sp, "s") : "pending") as "pending" | "shipped" | "cancelled" | "all";
  const c: SQL[] = [];
  if (status !== "all") c.push(eq(webOrders.status, status));

  const [rows, counts] = await Promise.all([
    db
      .select({
        id: webOrders.id,
        orderNo: webOrders.orderNo,
        status: webOrders.status,
        createdAt: webOrders.createdAt,
        vatApplied: webOrders.vatApplied,
        memo: webOrders.memo,
        partnerName: partners.name,
        salesDocNo: salesOrders.docNo,
        items: sql<number>`(select count(*)::int from web_order_lines l where l.order_id = web_orders.id)`,
        qty: sql<number>`(select coalesce(sum(l.qty), 0)::int from web_order_lines l where l.order_id = web_orders.id)`,
        supply: sql<number>`(select coalesce(sum(l.qty * l.unit_price), 0)::numeric from web_order_lines l where l.order_id = web_orders.id)`,
      })
      .from(webOrders)
      .innerJoin(partners, eq(partners.id, webOrders.partnerId))
      .leftJoin(salesOrders, eq(salesOrders.id, webOrders.salesOrderId))
      .where(c.length ? and(...c) : undefined)
      .orderBy(status === "pending" ? webOrders.createdAt : desc(webOrders.createdAt))
      .limit(200),
    db.select({ status: webOrders.status, n: sql<number>`count(*)::int` }).from(webOrders).groupBy(webOrders.status),
  ]);
  const count = Object.fromEntries(counts.map((x) => [x.status, x.n])) as Record<string, number>;

  return (
    <>
      <PageHeader title="온라인 주문" description="거래처가 주문 화면에서 넣은 주문입니다. 확인 후 출고 처리하면 판매 전표가 만들어지고 미수로 잡힙니다." />
      <StatusTabs counts={count} />
      <Panel className="mt-3 overflow-hidden">
        <Table className="text-[13px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
            <TableRow className="hover:bg-transparent">
              <TableHead className="th-label w-[140px]">주문번호</TableHead>
              <TableHead className="th-label w-[130px]">주문 시각</TableHead>
              <TableHead className="th-label">거래처</TableHead>
              <TableHead className="th-label w-[60px] text-right">품목</TableHead>
              <TableHead className="th-label w-[60px] text-right">수량</TableHead>
              <TableHead className="th-label w-[120px] text-right">주문 금액</TableHead>
              <TableHead className="th-label w-[90px]">상태</TableHead>
              <TableHead className="th-label">요청 사항 / 판매 전표</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState title={status === "pending" ? "처리할 주문이 없습니다" : "주문이 없습니다"} />
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const s = Number(r.supply);
              return (
                <TableRow key={r.id} className={r.status === "pending" ? "bg-status-critical/[0.03] shadow-[inset_3px_0_0_var(--status-critical)]" : ""}>
                  <TableCell className="code">
                    <Link href={`/orders/${r.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                      {r.status === "pending" && <span className="flex size-4 items-center justify-center rounded-full bg-status-critical font-sans text-[9px] font-bold text-white" aria-label="새 주문">N</span>}
                      {r.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular text-steel">{r.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell className="font-medium">{r.partnerName}</TableCell>
                  <TableCell className="tabular text-right">{r.items}</TableCell>
                  <TableCell className="tabular text-right">{r.qty}</TableCell>
                  <TableCell className="tabular text-right font-medium">{krw(r.vatApplied ? Math.round(s * 1.1) : s)}</TableCell>
                  <TableCell><OrderStatusChip s={r.status} /></TableCell>
                  <TableCell className="max-w-[260px] truncate text-steel">{r.salesDocNo ? `→ ${r.salesDocNo}` : (r.memo ?? "")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}
