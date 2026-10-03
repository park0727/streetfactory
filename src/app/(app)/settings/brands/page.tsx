import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { BrandsClient } from "./brands-client";

export const metadata = { title: "브랜드·로고" };

export default async function BrandsPage() {
  await requireModule("parts");
  const rows = await db
    .select({ id: brands.id, name: brands.name, logoUrl: brands.logoUrl, sortOrder: brands.sortOrder, partCount: sql<number>`(select count(*)::int from parts p where p.brand_id = brands.id)` })
    .from(brands)
    .orderBy(asc(brands.sortOrder), asc(brands.name));
  return (
    <>
      <PageHeader title="브랜드·로고" description="피렐리, 미쉐린처럼 브랜드와 로고를 등록하면, 그 브랜드로 지정한 부품의 주문 화면에 사이즈 밑에 로고가 작게 보입니다." />
      <BrandsClient rows={rows} />
    </>
  );
}
