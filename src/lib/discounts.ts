import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { discountRuleExclusions, discountRules } from "@/db/schema";
import type { ActiveRule } from "@/lib/pricing";

/** 켜져 있는 할인 규칙 + 제외 부품. 요청 단위 캐시. */
export const loadActiveRules = cache(async (): Promise<ActiveRule[]> => {
  const [rules, excl] = await Promise.all([db.select().from(discountRules).where(eq(discountRules.active, true)), db.select().from(discountRuleExclusions)]);
  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    categoryId: r.categoryId,
    brandId: r.brandId,
    baseRate: Number(r.baseRate),
    tiers: (r.tiers ?? []).filter((t) => t.minQty > 1 && t.rate > 0).sort((a, b) => a.minQty - b.minQty),
    qtyBasis: r.qtyBasis === "line" ? "line" : "total",
    pickMode: r.pickMode === "picked" ? "picked" : "target",
    listed: excl.filter((e) => e.ruleId === r.id).map((e) => e.partId),
  }));
});
