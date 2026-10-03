"use server";
import { revalidatePath } from "next/cache";
import { and, asc, eq, ne, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { brands, discountRuleExclusions, discountRules, parts } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const rate = z.number().min(0, "할인율은 0 이상").max(90, "할인율은 90% 이하");
const schema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, "규칙 이름을 입력하세요.").max(60),
  active: z.boolean(),
  categoryId: z.number().int().positive().nullable(),
  brandId: z.number().int().positive().nullable(),
  baseRate: rate,
  tiers: z.array(z.object({ minQty: z.number().int().min(2, "수량 할인은 2개 이상부터 정할 수 있습니다."), rate })).max(6),
  qtyBasis: z.enum(["total", "line"]),
  pickMode: z.enum(["target", "picked"]),
  listed: z.array(z.number().int().positive()).max(2000), // target: 뺄 상품, picked: 포함할 상품
});
export type RuleInput = z.infer<typeof schema>;

function refresh() {
  ["/settings/discounts", "/shop", "/shop/cart"].forEach((p) => revalidatePath(p));
}

export async function saveRule(input: RuleInput): Promise<ActionResult> {
  await requireModule("parts");
  const r = schema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const d = r.data;
  if (d.baseRate === 0 && d.tiers.length === 0) return { ok: false, error: "기본 할인이나 수량 할인 중 하나는 넣어 주세요." };
  if (d.pickMode === "picked" && d.listed.length === 0) return { ok: false, error: "할인할 상품을 하나 이상 골라 주세요." };
  const tiers = [...new Map(d.tiers.map((t) => [t.minQty, t])).values()].sort((a, b) => a.minQty - b.minQty);
  await db.transaction(async (tx) => {
    const values = { name: d.name, active: d.active, categoryId: d.pickMode === "picked" ? null : d.categoryId, brandId: d.pickMode === "picked" ? null : d.brandId, baseRate: d.baseRate, tiers, qtyBasis: d.qtyBasis, pickMode: d.pickMode };
    let id = d.id;
    if (id) await tx.update(discountRules).set(values).where(eq(discountRules.id, id));
    else id = (await tx.insert(discountRules).values(values).returning({ id: discountRules.id }))[0].id;
    await tx.delete(discountRuleExclusions).where(eq(discountRuleExclusions.ruleId, id));
    if (d.listed.length) await tx.insert(discountRuleExclusions).values([...new Set(d.listed)].map((partId) => ({ ruleId: id!, partId })));
  });
  refresh();
  return { ok: true, message: "할인 규칙을 저장했습니다. 주문 화면에 바로 반영됩니다." };
}

export async function setRuleActive(id: number, active: boolean): Promise<ActionResult> {
  await requireModule("parts");
  await db.update(discountRules).set({ active }).where(eq(discountRules.id, id));
  refresh();
  return { ok: true, message: active ? "규칙을 켰습니다." : "규칙을 껐습니다." };
}

export async function deleteRule(id: number): Promise<ActionResult> {
  await requireModule("parts");
  await db.delete(discountRules).where(eq(discountRules.id, id));
  refresh();
  return { ok: true, message: "할인 규칙을 지웠습니다." };
}

/** 제외할 부품을 고르는 목록: 대상(카테고리·브랜드)에 해당하는 단종 아닌 부품 */
export async function listTargetParts(categoryId: number | null, brandId: number | null) {
  await requireModule("parts");
  const c: SQL[] = [ne(parts.status, "discontinued")];
  if (categoryId) c.push(eq(parts.categoryId, categoryId));
  if (brandId) c.push(eq(parts.brandId, brandId));
  return db
    .select({ id: parts.id, code: parts.code, name: parts.name, tireSize: parts.tireSize, brandName: brands.name, online: parts.online })
    .from(parts)
    .leftJoin(brands, eq(brands.id, parts.brandId))
    .where(and(...c))
    .orderBy(asc(parts.tireSize), asc(parts.name), asc(parts.code))
    .limit(1000);
}
