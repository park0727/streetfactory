import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { webOrders } from "@/db/schema";
import { requireCustomer } from "@/lib/shop";
import { krw } from "@/lib/format";
import { OrderStatusChip } from "../../order-status";

export const metadata = { title: "주문 내역" };

export default async function MyOrdersPage() {
  const me = await requireCustomer();
  const rows = await db
    .select({
      id: webOrders.id,
      orderNo: webOrders.orderNo,
      status: webOrders.status,
      vatApplied: webOrders.vatApplied,
      createdAt: webOrders.createdAt,
      items: sql<number>`(select count(*)::int from web_order_lines l where l.order_id = web_orders.id)`,
      supply: sql<number>`(select coalesce(sum(l.qty * l.unit_price), 0)::numeric from web_order_lines l where l.order_id = web_orders.id)`,
      firstName: sql<string>`(select p.name from web_order_lines l join parts p on p.id = l.part_id where l.order_id = web_orders.id order by l.line_no limit 1)`,
    })
    .from(webOrders)
    .where(eq(webOrders.partnerId, me.partnerId))
    .orderBy(desc(webOrders.createdAt))
    .limit(100);

  return (
    <div className="space-y-3">
      <h1 className="font-display text-[22px] font-semibold">주문 내역</h1>
      {rows.length === 0 ? (
        <div className="rounded-md border bg-card px-6 py-14 text-center text-sm text-steel">아직 주문이 없습니다.</div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-md border bg-card">
          {rows.map((r) => {
            const s = Number(r.supply);
            const total = r.vatApplied ? Math.round(s * 1.1) : s;
            return (
              <li key={r.id}>
                <Link href={`/orders/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="code text-[12.5px]">{r.orderNo}</span>
                      <OrderStatusChip s={r.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[14px]">
                      {r.firstName}
                      {r.items > 1 && <span className="text-steel"> 외 {r.items - 1}건</span>}
                    </p>
                    <p className="text-[12px] text-steel">{r.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <span className="tabular shrink-0 font-semibold">{krw(total)}</span>
                  <ChevronRight className="size-4 shrink-0 text-steel" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
