"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { stockMovements, vStock, parts } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  partId: z.coerce.number().int().positive(),
  actualQty: z.coerce.number().int().min(0, "실사 수량은 0 이상이어야 합니다."),
  memo: z.string().trim().min(1, "조정 사유를 입력하세요.").max(200),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다."),
});

/** 실사 조정: 실제 수량을 입력하면 차이만큼 adjustment 이동을 만든다. */
export async function adjustStock(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireModule("parts");
  const r = schema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { partId, actualQty, memo, occurredAt } = r.data;

  const [cur] = await db.select({ qty: vStock.qty }).from(vStock).where(eq(vStock.partId, partId));
  const [p] = await db.select({ avgCost: parts.avgCost, code: parts.code }).from(parts).where(eq(parts.id, partId));
  if (!cur || !p) return { ok: false, error: "부품을 찾을 수 없습니다." };
  const diff = actualQty - cur.qty;
  if (diff === 0) return { ok: false, error: "현재재고와 같은 수량입니다. 조정할 차이가 없습니다." };

  await db.insert(stockMovements).values({
    partId,
    type: "adjustment",
    qty: diff,
    unitCost: p.avgCost,
    occurredAt,
    memo,
    createdBy: me.id,
  });
  revalidatePath("/inventory");
  revalidatePath("/");
  return { ok: true, message: `${p.code} 재고를 ${cur.qty} → ${actualQty} 로 조정했습니다 (${diff > 0 ? "+" : ""}${diff}).` };
}
