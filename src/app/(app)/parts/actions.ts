"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parts, stockMovements } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";
import { partSchema, formToObject } from "./schema";

export async function savePart(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireModule("parts");
  const r = partSchema.safeParse(formToObject(fd));
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, openingQty, openingUnitCost, ...v } = r.data;
  const values = {
    name: v.name,
    categoryId: v.categoryId,
    spec: v.spec ?? null,
    manufacturer: v.manufacturer ?? null,
    country: v.country ?? null,
    supplierId: v.supplierId ?? null,
    standardCost: v.standardCost,
    retailPrice: v.retailPrice,
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
  return { ok: true, message: id ? "부품 정보를 수정했습니다." : `${v.code} 를 등록했습니다.` };
}

export async function setPartStatus(id: number, status: "active" | "paused" | "discontinued"): Promise<ActionResult> {
  await requireModule("parts");
  await db.update(parts).set({ status }).where(eq(parts.id, id));
  revalidatePath("/parts");
  return { ok: true, message: "운영상태를 바꿨습니다." };
}
