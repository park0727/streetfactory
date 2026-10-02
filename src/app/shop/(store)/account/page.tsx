import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { salesOrders, vSalesSettlement } from "@/db/schema";
import { requireCustomer } from "@/lib/shop";
import { krw } from "@/lib/format";
import { PRICE_TIER } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { shopLogout } from "../../actions";
import { StatementList } from "./statement-list";
import { ShopPasswordForm } from "./password-form";

export const metadata = { title: "내 정보" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireCustomer();
  const forced = me.mustChangePassword || (await searchParams).pw === "1";
  const [[bal], docs] = await Promise.all([
    db
      .select({ balance: sql<number>`coalesce(sum(greatest(${vSalesSettlement.balance}, 0)), 0)::numeric`, n: sql<number>`count(*) filter (where ${vSalesSettlement.balance} > 0)::int` })
      .from(vSalesSettlement)
      .where(eq(vSalesSettlement.partnerId, me.partnerId)),
    db
      .select({
        id: salesOrders.id,
        docNo: salesOrders.docNo,
        docDate: salesOrders.docDate,
        total: vSalesSettlement.amountTotal,
        balance: vSalesSettlement.balance,
        payStatus: vSalesSettlement.payStatus,
        dueDate: salesOrders.dueDate,
      })
      .from(salesOrders)
      .innerJoin(vSalesSettlement, eq(vSalesSettlement.orderId, salesOrders.id))
      .where(and(eq(salesOrders.partnerId, me.partnerId), gt(salesOrders.docDate, sql`current_date - interval '365 days'`)))
      .orderBy(desc(salesOrders.docDate), desc(salesOrders.id))
      .limit(100),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-semibold">내 정보</h1>

      {me.mustChangePassword && (
        <div className="rounded-md border border-status-warn/40 bg-status-warn/5 p-3 text-[13.5px]">
          처음 로그인하셨습니다. 아래에서 새 비밀번호를 정해 주세요. 바꾸고 나면 상품을 주문할 수 있습니다.
        </div>
      )}

      <section className="rounded-md border bg-card p-4">
        <p className="text-[16px] font-semibold">{me.partnerName}</p>
        <p className="text-[13px] text-steel">{me.name} · {me.email}</p>
        <p className="mt-1 text-[12.5px] text-steel">
          적용 가격: {PRICE_TIER[me.priceTier]}
          {me.discountRate > 0 && ` −${me.discountRate}%`} · {me.vatApplied ? "부가세 별도 청구" : "부가세 별도 청구 없음"}
        </p>
      </section>

      {!me.mustChangePassword && (
        <section className={`rounded-md border bg-card p-4 ${Number(bal.balance) > 0 ? "border-status-critical/40" : ""}`}>
          <p className="th-label">미수 잔액</p>
          <p className={`tabular mt-1 text-[26px] font-semibold leading-tight ${Number(bal.balance) > 0 ? "text-status-critical" : ""}`}>{krw(bal.balance)}</p>
          <p className="text-[12.5px] text-steel">{Number(bal.balance) > 0 ? `입금이 남은 거래 ${bal.n}건` : "남은 미수금이 없습니다."}</p>
        </section>
      )}

      {!me.mustChangePassword && <StatementList docs={docs.map((d) => ({ ...d, total: Number(d.total), balance: Number(d.balance) }))} />}

      <section className="rounded-md border bg-card p-4">
        <p className="mb-3 text-[15px] font-semibold">{forced ? "새 비밀번호 정하기" : "비밀번호 변경"}</p>
        <ShopPasswordForm forced={me.mustChangePassword} />
      </section>

      <form action={shopLogout}>
        <Button type="submit" variant="outline" className="h-11 w-full">로그아웃</Button>
      </form>
    </div>
  );
}
