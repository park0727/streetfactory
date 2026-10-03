import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, discountRules } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { RulesClient } from "./rules-client";

export const metadata = { title: "할인 규칙" };

export default async function DiscountsPage() {
  await requireModule("parts");
  const [rules, cats, brs] = await Promise.all([
    db
      .select({
        id: discountRules.id,
        name: discountRules.name,
        active: discountRules.active,
        categoryId: discountRules.categoryId,
        brandId: discountRules.brandId,
        categoryName: categories.name,
        brandName: brands.name,
        baseRate: discountRules.baseRate,
        tiers: discountRules.tiers,
        excluded: sql<number[]>`coalesce((select jsonb_agg(e.part_id) from discount_rule_exclusions e where e.rule_id = discount_rules.id), '[]'::jsonb)`,
      })
      .from(discountRules)
      .leftJoin(categories, eq(categories.id, discountRules.categoryId))
      .leftJoin(brands, eq(brands.id, discountRules.brandId))
      .orderBy(asc(discountRules.createdAt)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
  ]);
  return (
    <>
      <PageHeader
        title="할인 규칙"
        description="모든 거래처의 주문 화면에 공통으로 적용됩니다. 거래처에 따로 정한 할인율과 비교해 더 큰 할인 하나만 적용됩니다."
      />
      <RulesClient rules={rules.map((r) => ({ ...r, baseRate: Number(r.baseRate), excluded: (r.excluded ?? []).map(Number) }))} cats={cats} brands={brs} />
    </>
  );
}
