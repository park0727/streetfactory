import { and, asc, count, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { banners, brands, categories, parts, vAvailable } from "@/db/schema";
import { todayKST } from "@/lib/dates";
import { BannerCarousel } from "../banner-carousel";
import { loadActiveRules } from "@/lib/discounts";
import { getShopSettings, requireCustomer } from "@/lib/shop";
import { availability, quotePart, shown } from "@/lib/pricing";
import { int, str } from "@/lib/query-params";
import { CatalogFilters } from "./catalog-filters";
import { ProductRow } from "./product-row";
import { LoadMore } from "./load-more";
import { InstallApp } from "@/components/install-app";
import { ContactCall } from "../contact-call";

export const metadata = { title: "상품" };
const PAGE = 40;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireCustomer();
  const sp = await searchParams;
  const q = str(sp, "q");
  const cat = int(sp, "cat", 0);
  const brand = int(sp, "brand", 0);
  const limit = int(sp, "n", PAGE);

  const conds: SQL[] = [eq(parts.online, true), ne(parts.status, "discontinued")];
  if (q) {
    // 사이즈는 130/70-13, 130-70-13, 1307013 어느 형태로 쳐도 찾히게 숫자만 비교
    const digits = q.replace(/\D/g, "");
    conds.push(
      or(
        ilike(parts.code, `%${q}%`),
        ilike(parts.name, `%${q}%`),
        ilike(parts.spec, `%${q}%`),
        ilike(parts.manufacturer, `%${q}%`),
        ilike(brands.name, `%${q}%`),
        ilike(parts.tireSize, `%${q}%`),
        ...(digits.length >= 3 ? [sql`regexp_replace(coalesce(${parts.tireSize}, ''), '\\D', '', 'g') like ${`%${digits}%`}`] : []),
      )!,
    );
  }
  if (cat) conds.push(eq(parts.categoryId, cat));
  if (brand) conds.push(eq(parts.brandId, brand));
  const where = and(...conds);

  const [rows, [{ total }], cats, settings, rules] = await Promise.all([
    db
      .select({
        id: parts.id,
        code: parts.code,
        name: parts.name,
        spec: parts.spec,
        manufacturer: parts.manufacturer,
        categoryId: parts.categoryId,
        brandId: parts.brandId,
        brandName: brands.name,
        brandLogo: brands.logoUrl,
        tireSize: parts.tireSize,
        retailPrice: parts.retailPrice,
        wholesalePrice: parts.wholesalePrice,
        onlinePrice: parts.onlinePrice,
        status: parts.status,
        available: vAvailable.available,
      })
      .from(parts)
      .innerJoin(vAvailable, eq(vAvailable.partId, parts.id))
      .leftJoin(brands, eq(brands.id, parts.brandId))
      .where(where)
      // 주문 가능한 상품을 먼저, 품절은 아래로
      .orderBy(sql`case when ${parts.status} = 'active' and ${vAvailable.available} > 0 then 0 else 1 end`, asc(parts.tireSize), asc(parts.name), asc(parts.code))
      .limit(Math.min(limit, 400)),
    db.select({ total: count() }).from(parts).leftJoin(brands, eq(brands.id, parts.brandId)).where(where),
    db
      .selectDistinct({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder })
      .from(categories)
      .innerJoin(parts, and(eq(parts.categoryId, categories.id), eq(parts.online, true), ne(parts.status, "discontinued")))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    getShopSettings(),
    loadActiveRules(),
  ]);


  const today = todayKST();
  const [ads, brandList] = await Promise.all([
    db
      .select({ id: banners.id, imageUrl: banners.imageUrl, title: banners.title, linkUrl: banners.linkUrl })
      .from(banners)
      .where(and(eq(banners.active, true), sql`(${banners.startsOn} is null or ${banners.startsOn} <= ${today}) and (${banners.endsOn} is null or ${banners.endsOn} >= ${today})`))
      .orderBy(asc(banners.sortOrder), asc(banners.id)),
    // 고른 카테고리 안에 주문 가능한 상품이 있는 브랜드만 (눌렀을 때 빈 목록이 나오지 않게)
    db
      .selectDistinct({ id: brands.id, name: brands.name, logoUrl: brands.logoUrl, sortOrder: brands.sortOrder })
      .from(brands)
      .innerJoin(parts, and(eq(parts.brandId, brands.id), eq(parts.online, true), ne(parts.status, "discontinued"), cat ? eq(parts.categoryId, cat) : undefined))
      .orderBy(asc(brands.sortOrder), asc(brands.name)),
  ]);

  return (
    <div className="space-y-3">
      {!q && !cat && !brand && <BannerCarousel items={ads} />}
      <InstallApp variant="banner" />
      {settings?.shopNotice && <p className="rounded-md border border-signal/30 bg-signal/5 px-3 py-2 text-[13px] whitespace-pre-line">{settings.shopNotice}</p>}
      <CatalogFilters cats={cats.map((c) => ({ id: c.id, name: c.name }))} brands={brandList.map((b) => ({ id: b.id, name: b.name, logoUrl: b.logoUrl }))} />
      <p className="text-[12px] text-steel">{total.toLocaleString()}개 상품</p>
      {rows.length === 0 ? (
        <div className="rounded-md border bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium">조건에 맞는 상품이 없습니다</p>
          <p className="mt-1 text-[13px] text-steel">검색어를 바꾸거나 다른 카테고리·브랜드를 골라 보세요.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-md border bg-card">
          {rows.map((r) => {
            const q = quotePart(r, me, rules, 1);
            return (
              <ProductRow
                key={r.id}
                p={{
                  partId: r.id,
                  code: r.code,
                  name: r.name,
                  spec: r.spec,
                  manufacturer: r.manufacturer,
                  tireSize: r.tireSize,
                  brandName: r.brandName,
                  brandLogo: r.brandLogo,
                  price: shown(q.unit, me.vatApplied),
                  list: shown(q.list, me.vatApplied),
                  off: q.off,
                  nextTier: q.nextTier,
                  availability: availability(r.available, r.status),
                  paused: r.status === "paused",
                }}
              />
            );
          })}
        </ul>
      )}
      {rows.length < total && <LoadMore next={limit + PAGE} />}
      <ContactCall phone={settings?.phone} variant="card" className="mt-2" />
    </div>
  );
}
