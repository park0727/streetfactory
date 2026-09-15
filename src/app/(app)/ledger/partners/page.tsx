import { asc } from "drizzle-orm";
import { db } from "@/db";
import { partners, vSalesSettlement } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requireModule } from "@/lib/auth";
import { int, str, PAGE_SIZE } from "@/lib/query-params";
import { isDate, monthStart, todayKST } from "@/lib/dates";
import { krw, num, pct } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Kpi } from "@/components/kpi";
import { salesLineQuery, salesLineSummary, salesLineWhere } from "../queries";
import { LedgerToolbar } from "./toolbar";
import { LedgerTable } from "./ledger-table";
import { LedgerExportButton } from "./export-button";

export const metadata = { title: "거래처 원장" };

export default async function PartnerLedgerPage({ searchParams }: PageProps<"/ledger/partners">) {
  await requireModule("parts");
  const sp = await searchParams;
  const today = todayKST();
  const from = isDate(str(sp, "from")) ? str(sp, "from") : monthStart(today);
  const to = isDate(str(sp, "to")) ? str(sp, "to") : today;
  const partnerId = int(sp, "partner", 0);
  const q = str(sp, "q");
  const sort = (["date_desc", "date_asc", "amount_desc"].includes(str(sp, "sort")) ? str(sp, "sort") : "date_desc") as "date_desc" | "date_asc" | "amount_desc";
  const page = int(sp, "page", 1);

  const where = salesLineWhere({ from, to, partnerId: partnerId || undefined, q: q || undefined });
  const balWhere = [gte(vSalesSettlement.docDate, from), lte(vSalesSettlement.docDate, to), ...(partnerId ? [eq(vSalesSettlement.partnerId, partnerId)] : [])];
  const [rows, [summary], plist, [bal]] = await Promise.all([
    salesLineQuery(where, sort).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    salesLineSummary(where),
    db.select({ id: partners.id, name: partners.name, code: partners.code }).from(partners).orderBy(asc(partners.name)),
    db.select({ balance: sql<number>`coalesce(sum(greatest(${vSalesSettlement.balance}, 0)), 0)::numeric`, unpaid: sql<number>`count(*) filter (where ${vSalesSettlement.balance} > 0)::int` }).from(vSalesSettlement).where(and(...balWhere)),
  ]);
  const total = summary.lines;
  const margin = Number(summary.amount) > 0 ? (Number(summary.profit) / Number(summary.amount)) * 100 : 0;
  const partnerName = partnerId ? (plist.find((p) => p.id === partnerId)?.name ?? "") : "전체 거래처";

  return (
    <>
      <PageHeader title="거래처 원장" description="거래처와 기간을 고르면 출고 내역과 집계가 바뀝니다." actions={<LedgerExportButton />} />
      <LedgerToolbar partners={plist} from={from} to={to} />
      <p className="mt-3 text-[13px] text-steel">
        <b className="text-foreground">{partnerName}</b> · {from} ~ {to}
      </p>
      <div className="mt-2 mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="출고 건수" value={num(summary.orders)} unit="건" sub={`${num(summary.lines)}개 라인`} />
        <Kpi label="출고 수량" value={num(summary.qty)} unit="개" />
        <Kpi label="총 거래금액" value={krw(summary.amount)} sub="공급가액" />
        <Kpi label="매출이익" value={krw(summary.profit)} tone={Number(summary.profit) < 0 ? "critical" : undefined} />
        <Kpi label="평균 마진율" value={pct(margin)} />
        <Kpi label="미수 잔액" value={krw(bal.balance)} sub={`미수 전표 ${num(bal.unpaid)}건 · 부가세 포함`} tone={Number(bal.balance) > 0 ? "critical" : undefined} />
      </div>
      <Panel className="overflow-hidden">
        <LedgerTable rows={rows} sort={sort} />
        <div className="border-t px-4 py-2.5">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </div>
      </Panel>
    </>
  );
}
