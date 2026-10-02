import { and, asc, count, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, parts, vAvailable } from "@/db/schema";
import { getShopSettings, requireCustomer } from "@/lib/shop";
import { availability, priceFor, PRICE_TIER } from "@/lib/pricing";
import { int, str } from "@/lib/query-params";
import { CatalogFilters } from "./catalog-filters";
import { ProductRow } from "./product-row";
import { LoadMore } from "./load-more";

export const metadata = { title: "상품" };
const PAGE = 40;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireCustomer();
  const sp = await searchParams;
  const q = str(sp, "q");
  const cat = int(sp, "cat", 0);
  const limit = int(sp, "n", PAGE);

  const conds: SQL[] = [eq(parts.online, true), ne(parts.status, "discontinued")];
  if (q) conds.push(or(ilike(parts.code, `%${q}%`), ilike(parts.name, `%${q}%`), ilike(parts.spec, `%${q}%`), ilike(parts.manufacturer, `%${q}%`))!);
  if (cat) conds.push(eq(parts.categoryId, cat));
  const where = and(...conds);

  const [rows, [{ total }], cats, settings] = await Promise.all([
    db
      .select({
        id: parts.id,
        code: parts.code,
        name: parts.name,
        spec: parts.spec,
        manufacturer: parts.manufacturer,
        retailPrice: parts.retailPrice,
        wholesalePrice: parts.wholesalePrice,
        status: parts.status,
        available: vAvailable.available,
      })
      .from(parts)
      .innerJoin(vAvailable, eq(vAvailable.partId, parts.id))
      .where(where)
      .orderBy(asc(parts.name), asc(parts.code))
      .limit(Math.min(limit, 400)),
    db.select({ total: count() }).from(parts).where(where),
    db
      .selectDistinct({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder })
      .from(categories)
      .innerJoin(parts, and(eq(parts.categoryId, categories.id), eq(parts.online, true), ne(parts.status, "discontinued")))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    getShopSettings(),
  ]);

  const priceNote = me.priceTier === "wholesale" || me.discountRate > 0 ? `${me.partnerName} 적용가 (${PRICE_TIER[me.priceTier]}${me.discountRate > 0 ? ` −${me.discountRate}%` : ""})` : "권장소비자가";

  return (
    <div className="space-y-3">
      {settings?.shopNotice && <p className="rounded-md border border-signal/30 bg-signal/5 px-3 py-2 text-[13px] whitespace-pre-line">{settings.shopNotice}</p>}
      <CatalogFilters cats={cats.map((c) => ({ id: c.id, name: c.name }))} />
      <p className="text-[12px] text-steel">
        {total.toLocaleString()}개 상품 · 가격은 {priceNote}, 부가세 별도
      </p>
      {rows.length === 0 ? (
        <div className="rounded-md border bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium">조건에 맞는 상품이 없습니다</p>
          <p className="mt-1 text-[13px] text-steel">검색어를 바꾸거나 다른 카테고리를 골라 보세요.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-md border bg-card">
          {rows.map((r) => (
            <ProductRow
              key={r.id}
              p={{ partId: r.id, code: r.code, name: r.name, spec: r.spec, manufacturer: r.manufacturer, price: priceFor(r, me), availability: availability(r.available, r.status), paused: r.status === "paused" }}
            />
          ))}
        </ul>
      )}
      {rows.length < total && <LoadMore next={limit + PAGE} />}
    </div>
  );
}
