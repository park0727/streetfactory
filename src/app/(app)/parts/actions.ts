"use server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, parts, stockMovements } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";
import { partFormSchema, formToObject } from "./schema";

export async function savePart(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireModule("parts");
  const r = partFormSchema.safeParse(formToObject(fd));
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, openingQty, openingUnitCost, newCategory, ...v } = r.data;

  // 새 카테고리 이름이 오면 만들거나(이미 있으면) 기존 것을 쓴다
  let categoryId = v.categoryId;
  if (newCategory) {
    const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, newCategory));
    if (existing) categoryId = existing.id;
    else {
      const [c] = await db.insert(categories).values({ name: newCategory, sortOrder: 99 }).returning({ id: categories.id });
      categoryId = c.id;
    }
  }
  if (!categoryId) return { ok: false, error: "카테고리를 선택하거나 새 이름을 입력하세요." };

  const values = {
    name: v.name,
    categoryId,
    spec: v.spec ?? null,
    manufacturer: v.manufacturer ?? null,
    country: v.country ?? null,
    supplierId: v.supplierId ?? null,
    standardCost: v.standardCost,
    retailPrice: v.retailPrice,
    wholesalePrice: v.wholesalePrice,
    onlinePrice: v.onlinePrice,
    brandId: v.brandId ?? null,
    tireSize: v.tireSize || null,
    online: v.online ?? false,
    safetyStock: v.safetyStock,
    status: v.status,
    memo: v.memo ?? null,
  };

  try {
    if (id) {
      // 부품코드는 불변: code 는 업데이트하지 않는다.
      await db.update(parts).set(values).where(eq(parts.id, id));
    } else {
      await db.transaction(async (tx) => {
        const unit = openingUnitCost ?? v.standardCost;
        const [row] = await tx
          .insert(parts)
          .values({ ...values, code: v.code, avgCost: unit })
          .returning({ id: parts.id });
        if (openingQty && openingQty > 0) {
          await tx.insert(stockMovements).values({
            partId: row.id,
            type: "opening",
            qty: openingQty,
            unitCost: unit,
            occurredAt: new Date().toISOString().slice(0, 10),
            memo: "기초재고",
            createdBy: me.id,
          });
        }
      });
    }
  } catch (e) {
    const msg = dbErrorMessage(e);
    return { ok: false, error: msg === "이미 존재하는 값입니다." ? `부품코드 ${v.code} 는 이미 등록되어 있습니다.` : msg };
  }
  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/shop");
  if (newCategory) revalidatePath("/settings/master");
  return { ok: true, message: id ? "부품 정보를 수정했습니다." : `${v.code} 를 등록했습니다.` };
}

export async function setPartStatus(id: number, status: "active" | "paused" | "discontinued"): Promise<ActionResult> {
  await requireModule("parts");
  await db.update(parts).set({ status }).where(eq(parts.id, id));
  revalidatePath("/parts");
  return { ok: true, message: "운영상태를 바꿨습니다." };
}

/** 목록에서 온라인 판매 노출을 바로 켜고 끈다 */
export async function setPartOnline(id: number, online: boolean): Promise<ActionResult> {
  await requireModule("parts");
  await db.update(parts).set({ online }).where(eq(parts.id, id));
  revalidatePath("/parts");
  revalidatePath("/shop");
  return { ok: true, message: online ? "주문 화면에 노출합니다." : "주문 화면에서 숨겼습니다." };
}

/** 검색된 여러 부품의 온라인 판매를 한 번에 */
export async function setPartsOnline(ids: number[], online: boolean): Promise<ActionResult> {
  await requireModule("parts");
  const clean = ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
  if (clean.length === 0) return { ok: false, error: "선택된 부품이 없습니다." };
  await db.update(parts).set({ online }).where(inArray(parts.id, clean));
  revalidatePath("/parts");
  revalidatePath("/shop");
  return { ok: true, message: `${clean.length}개 부품을 ${online ? "주문 화면에 노출" : "주문 화면에서 숨김"} 처리했습니다.` };
}
