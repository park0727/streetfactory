import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { FileUp, Plus } from "lucide-react";
import { db } from "@/db";
import { categories, parts, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { int, str, PAGE_SIZE } from "@/lib/query-params";
import { PageHeader, Panel } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { PartsToolbar } from "./toolbar";
import { PartsTable, NewPartButton } from "./parts-table";
import { ExportButton } from "./export-button";

export const metadata = { title: "부품 마스터" };

export default async function PartsPage({ searchParams }: PageProps<"/parts">) {
  await requireModule("parts");
  const sp = await searchParams;
  const q = str(sp, "q");
  const cat = int(sp, "cat", 0);
  const mfr = str(sp, "mfr");
  const status = str(sp, "status");
  const page = int(sp, "page", 1);

  const conds: SQL[] = [];
  if (q) conds.push(or(ilike(parts.code, `%${q}%`), ilike(parts.name, `%${q}%`), ilike(parts.spec, `%${q}%`))!);
  if (cat) conds.push(eq(parts.categoryId, cat));
  if (mfr) conds.push(eq(parts.manufacturer, mfr));
  if (status === "active" || status === "paused" || status === "discontinued") conds.push(eq(parts.status, status));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, [{ total }], cats, sups, mfrs] = await Promise.all([
    db
      .select({
        id: parts.id,
        code: parts.code,
        name: parts.name,
        categoryId: parts.categoryId,
        categoryName: categories.name,
        spec: parts.spec,
        manufacturer: parts.manufacturer,
        country: parts.country,
        supplierId: parts.supplierId,
        supplierName: suppliers.name,
        standardCost: parts.standardCost,
        retailPrice: parts.retailPrice,
        avgCost: parts.avgCost,
        safetyStock: parts.safetyStock,
        status: parts.status,
        memo: parts.memo,
      })
      .from(parts)
      .innerJoin(categories, eq(categories.id, parts.categoryId))
      .leftJoin(suppliers, eq(suppliers.id, parts.supplierId))
      .where(where)
      .orderBy(asc(parts.code))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(parts).where(where),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: suppliers.id, name: suppliers.name, country: suppliers.country }).from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name)),
    db
      .select({ m: parts.manufacturer })
      .from(parts)
      .where(sql`${parts.manufacturer} is not null and ${parts.manufacturer} <> ''`)
      .groupBy(parts.manufacturer)
      .orderBy(desc(count()), asc(parts.manufacturer)),
  ]);

  const manufacturers = mfrs.map((r) => r.m!).filter(Boolean);

  return (
    <>
      <PageHeader
        title="부품 마스터"
        description="부품 기준정보의 원본입니다. 코드는 등록 후 바꿀 수 없고, 단종은 운영상태로 처리합니다."
        actions={
          <>
            <ExportButton />
            <Button variant="outline" size="sm" asChild>
              <Link href="/parts/import">
                <FileUp /> 엑셀 업로드
              </Link>
            </Button>
            <NewPartButton cats={cats} sups={sups}>
              <Plus /> 부품 등록
            </NewPartButton>
          </>
        }
      />
      <PartsToolbar cats={cats} manufacturers={manufacturers} />
      <Panel className="mt-3 overflow-hidden">
        <PartsTable rows={rows} cats={cats} sups={sups} />
        <div className="border-t px-4 py-2.5">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </div>
      </Panel>
    </>
  );
}
