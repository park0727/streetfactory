import { and, asc, count, eq, ilike, ne, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, vInventory } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { int, str, PAGE_SIZE } from "@/lib/query-params";
import { krw, num } from "@/lib/format";
import { PageHeader, Panel } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Kpi } from "@/components/kpi";
import { InventoryToolbar } from "./toolbar";
import { InventoryTable } from "./inventory-table";
import { ExportButton } from "./export-button";

export const metadata = { title: "재고 현황" };

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  await requireModule("parts");
  const sp = await searchParams;
  const q = str(sp, "q");
  const cat = int(sp, "cat", 0);
  const stock = str(sp, "stock"); // ok | low | out | alert
  const includeDisc = str(sp, "disc") === "1";
  const page = int(sp, "page", 1);

  const conds: SQL[] = [];
  if (q) conds.push(or(ilike(vInventory.code, `%${q}%`), ilike(vInventory.name, `%${q}%`), ilike(vInventory.spec, `%${q}%`))!);
  if (cat) conds.push(eq(vInventory.categoryId, cat));
  if (stock === "alert") conds.push(ne(vInventory.stockStatus, "ok"));
  else if (stock === "ok" || stock === "low" || stock === "out") conds.push(eq(vInventory.stockStatus, stock));
  if (!includeDisc) conds.push(ne(vInventory.status, "discontinued"));
  const where = conds.length ? and(...conds) : undefined;

  // 경고 우선, 그 다음 코드순
  const alertOrder = sql`case ${vInventory.stockStatus} when 'out' then 0 when 'low' then 1 else 2 end`;

  const [rows, [{ total }], [summary], cats] = await Promise.all([
    db
      .select()
      .from(vInventory)
      .where(where)
      .orderBy(asc(alertOrder), asc(vInventory.code))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(vInventory).where(where),
    db
      .select({
        items: count(),
        alerts: sql<number>`count(*) filter (where ${vInventory.stockStatus} <> 'ok')::int`,
        out: sql<number>`count(*) filter (where ${vInventory.stockStatus} = 'out')::int`,
        value: sum(vInventory.stockValue),
        qty: sum(vInventory.qty),
      })
      .from(vInventory)
      .where(ne(vInventory.status, "discontinued")),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  return (
    <>
      <PageHeader
        title="재고 현황"
        description="현재재고 = 기초 + 입고 − 판매 ± 조정. 안전재고 미달과 품절 품목이 위로 올라옵니다."
        actions={<ExportButton />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="운영 품목" value={num(summary.items)} unit="종" />
        <Kpi label="발주 필요" value={num(summary.alerts)} unit="종" tone={summary.alerts > 0 ? "warn" : undefined} sub={`품절 ${num(summary.out)}종 포함`} />
        <Kpi label="총 재고 수량" value={num(summary.qty ?? 0)} unit="개" />
        <Kpi label="재고 평가액" value={krw(summary.value ?? 0)} sub="현재재고 × 평균원가" />
      </div>
      <InventoryToolbar cats={cats} />
      <Panel className="mt-3 overflow-hidden">
        <InventoryTable rows={rows} />
        <div className="border-t px-4 py-2.5">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </div>
      </Panel>
    </>
  );
}
