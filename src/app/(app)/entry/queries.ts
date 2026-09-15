import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { vInventory } from "@/db/schema";
import type { PartHit } from "./actions";

/** 전표 수정 화면에서 기존 라인의 부품 정보를 PartHit 형태로 */
export async function partHitsByIds(ids: number[]): Promise<Map<number, PartHit>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: vInventory.id,
      code: vInventory.code,
      name: vInventory.name,
      spec: vInventory.spec,
      qty: vInventory.qty,
      retailPrice: vInventory.retailPrice,
      avgCost: vInventory.avgCost,
      standardCost: vInventory.standardCost,
      stockStatus: vInventory.stockStatus,
      status: vInventory.status,
      supplierId: vInventory.supplierId,
    })
    .from(vInventory)
    .where(inArray(vInventory.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
