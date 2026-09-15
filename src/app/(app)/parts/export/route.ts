import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, parts, suppliers } from "@/db/schema";
import { getProfile } from "@/lib/auth";

/** 부품 마스터 전체를 JSON 으로. 엑셀 변환은 브라우저에서 한다. */
export async function GET() {
  const me = await getProfile();
  if (!me || !me.isActive || (!me.canParts && me.role !== "admin")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db
    .select({
      code: parts.code,
      name: parts.name,
      category: categories.name,
      spec: parts.spec,
      manufacturer: parts.manufacturer,
      country: parts.country,
      supplier: suppliers.name,
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
    .orderBy(asc(parts.code));
  return NextResponse.json(rows);
}
