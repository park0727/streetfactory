import Link from "next/link";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  partners,
  salesLines,
  salesOrders,
  vSalesSettlement,
} from "@/db/schema";
import { PayStatusBadge } from "./[id]/settlement";
import { PayFilter } from "./pay-filter";
import {
  PrintSelection,
  RowCheck,
  HeadCheck,
  PrintSelectedButton,
} from "./print-select";
import { requireModule } from "@/lib/auth";
import { int, str, PAGE_SIZE } from "@/lib/query-params";
import { addDays, isDate, todayKST } from "@/lib/dates";
import { krw, num, pct } from "@/lib/format";
import { PageHeader, Panel, EmptyState } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LedgerToolbar } from "../partners/toolbar";
import { LedgerRowActions } from "../row-actions";

export const metadata = { title: "판매 원장" };

export default async function SalesLedgerPage({
  searchParams,
}: PageProps<"/ledger/sales">) {
  await requireModule("parts");
  const sp = await searchParams;
  const today = todayKST();
  const from = isDate(str(sp, "from")) ? str(sp, "from") : addDays(today, -89);
  const to = isDate(str(sp, "to")) ? str(sp, "to") : today;
  const partnerId = int(sp, "partner", 0);
  const q = str(sp, "q");
  const pay = str(sp, "pay"); // unpaid | paid
  const page = int(sp, "page", 1);

  const c: SQL[] = [
    gte(salesOrders.docDate, from),
    lte(salesOrders.docDate, to),
  ];
  if (partnerId) c.push(eq(salesOrders.partnerId, partnerId));
  if (q)
    c.push(
      or(ilike(salesOrders.docNo, `%${q}%`), ilike(partners.name, `%${q}%`))!,
    );
  if (pay === "unpaid") c.push(sql`${vSalesSettlement.balance} > 0`);
  else if (pay === "paid") c.push(sql`${vSalesSettlement.balance} <= 0`);
  const where = and(...c);

  const agg = db
    .select({
      orderId: salesLines.orderId,
      lines: sql<number>`count(*)::int`.as("lines"),
      qty: sql<number>`sum(${salesLines.qty})::int`.as("qty"),
      amount:
        sql<number>`sum(${salesLines.qty} * ${salesLines.unitPrice})::numeric`.as(
          "amount",
        ),
      profit:
        sql<number>`sum(${salesLines.qty} * (${salesLines.unitPrice} - ${salesLines.unitCost}))::numeric`.as(
          "profit",
        ),
    })
    .from(salesLines)
    .groupBy(salesLines.orderId)
    .as("agg");

  const base = db
    .select({
      id: salesOrders.id,
      docNo: salesOrders.docNo,
      docDate: salesOrders.docDate,
      partnerName: partners.name,
      channel: salesOrders.channel,
      memo: salesOrders.memo,
      lines: sql<number>`coalesce(${agg.lines}, 0)`,
      qty: sql<number>`coalesce(${agg.qty}, 0)`,
      amount: sql<number>`coalesce(${agg.amount}, 0)`,
      profit: sql<number>`coalesce(${agg.profit}, 0)`,
      balance: sql<number>`coalesce(${vSalesSettlement.balance}, 0)`,
      payStatus: sql<
        "unpaid" | "partial" | "paid"
      >`coalesce(${vSalesSettlement.payStatus}, 'unpaid')`,
      taxInvoiceIssued: salesOrders.taxInvoiceIssued,
      dueDate: salesOrders.dueDate,
    })
    .from(salesOrders)
    .innerJoin(partners, eq(partners.id, salesOrders.partnerId))
    .leftJoin(agg, eq(agg.orderId, salesOrders.id))
    .leftJoin(vSalesSettlement, eq(vSalesSettlement.orderId, salesOrders.id))
    .where(where);

  const [rows, [tot], plist] = await Promise.all([
    base
      .orderBy(desc(salesOrders.docDate), desc(salesOrders.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({
        n: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${agg.amount}), 0)::numeric`,
        profit: sql<number>`coalesce(sum(${agg.profit}), 0)::numeric`,
        balance: sql<number>`coalesce(sum(${vSalesSettlement.balance}), 0)::numeric`,
      })
      .from(salesOrders)
      .innerJoin(partners, eq(partners.id, salesOrders.partnerId))
      .leftJoin(agg, eq(agg.orderId, salesOrders.id))
      .leftJoin(vSalesSettlement, eq(vSalesSettlement.orderId, salesOrders.id))
      .where(where),
    db
      .select({ id: partners.id, name: partners.name, code: partners.code })
      .from(partners)
      .orderBy(asc(partners.name)),
  ]);

  return (
    <>
      <PrintSelection>
        <PageHeader
          title="판매 원장"
          description="모든 판매/출고 전표. 전표를 열면 라인별 단가·원가 스냅샷을 볼 수 있습니다."
          actions={<PrintSelectedButton />}
        />
        <div className="flex flex-wrap items-center gap-2">
          <LedgerToolbar partners={plist} from={from} to={to} />
          <PayFilter />
        </div>
        <p className="mt-3 mb-3 text-[13px] text-steel">
          {from} ~ {to} · 전표 <b className="text-foreground">{num(tot.n)}</b>건
          · 매출 <b className="text-foreground">{krw(tot.amount)}</b> · 이익{" "}
          <b className="text-foreground">{krw(tot.profit)}</b> · 미수 잔액{" "}
          <b
            className={
              Number(tot.balance) > 0
                ? "text-status-critical"
                : "text-foreground"
            }
          >
            {krw(tot.balance)}
          </b>
        </p>
        <Panel className="overflow-hidden">
          <Table className="text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[36px]">
                  <HeadCheck ids={rows.map((r) => r.id)} />
                </TableHead>
                <TableHead className="th-label w-[140px]">판매번호</TableHead>
                <TableHead className="th-label w-[100px]">출고일</TableHead>
                <TableHead className="th-label">거래처</TableHead>
                <TableHead className="th-label w-[90px]">채널</TableHead>
                <TableHead className="th-label w-[60px] text-right">
                  품목
                </TableHead>
                <TableHead className="th-label w-[60px] text-right">
                  수량
                </TableHead>
                <TableHead className="th-label w-[120px] text-right">
                  매출액
                </TableHead>
                <TableHead className="th-label w-[110px] text-right">
                  매출이익
                </TableHead>
                <TableHead className="th-label w-[70px] text-right">
                  마진
                </TableHead>
                <TableHead className="th-label w-[90px]">결제</TableHead>
                <TableHead className="th-label w-[110px] text-right">
                  미수 잔액
                </TableHead>
                <TableHead className="th-label w-[60px]">계산서</TableHead>
                <TableHead className="th-label">메모</TableHead>
                <TableHead className="w-[72px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} className="p-0">
                    <EmptyState title="해당 기간에 전표가 없습니다" />
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const m =
                  Number(r.amount) > 0
                    ? (Number(r.profit) / Number(r.amount)) * 100
                    : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <RowCheck id={r.id} />
                    </TableCell>
                    <TableCell className="code">
                      <Link
                        href={`/ledger/sales/${r.id}`}
                        className="hover:underline"
                      >
                        {r.docNo}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular">{r.docDate}</TableCell>
                    <TableCell className="font-medium">
                      {r.partnerName}
                    </TableCell>
                    <TableCell className="text-steel">
                      {r.channel ?? "—"}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {num(r.lines)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {num(r.qty)}
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {krw(r.amount)}
                    </TableCell>
                    <TableCell
                      className={`tabular text-right ${Number(r.profit) < 0 ? "text-status-critical" : ""}`}
                    >
                      {krw(r.profit)}
                    </TableCell>
                    <TableCell className="tabular text-right text-steel">
                      {pct(m)}
                    </TableCell>
                    <TableCell>
                      <PayStatusBadge status={r.payStatus} />
                    </TableCell>
                    <TableCell
                      className={`tabular text-right ${Number(r.balance) > 0 ? "font-medium text-status-critical" : "text-steel"}`}
                    >
                      {Number(r.balance) > 0 ? krw(r.balance) : "—"}
                    </TableCell>
                    <TableCell className="text-[12px] text-steel">
                      {r.taxInvoiceIssued ? "발행" : "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-steel">
                      {r.memo ?? ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <LedgerRowActions
                        kind="sales"
                        id={r.id}
                        docNo={r.docNo}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-2.5">
            <Pagination page={page} pageSize={PAGE_SIZE} total={tot.n} />
          </div>
        </Panel>
      </PrintSelection>
    </>
  );
}
