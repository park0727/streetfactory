"use server";
import { revalidatePath } from "next/cache";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { inboundOrders, parts } from "@/db/schema";
import { requireAdmin, requireModule } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

/** 입고 전표 삭제 (관리자). 재고이동을 되돌리고 평균원가를 재계산한 뒤 전표를 지운다. */
export async function deleteInbound(id: number): Promise<ActionResult> {
  await requireAdmin();
  const [o] = await db.select({ docNo: inboundOrders.docNo }).from(inboundOrders).where(eq(inboundOrders.id, id));
  if (!o) return { ok: false, error: "전표를 찾을 수 없습니다." };
  await db.transaction(async (tx) => {
    await tx.execute(sql`select public.fn_unpost_inbound(${id})`);
    await tx.delete(inboundOrders).where(eq(inboundOrders.id, id));
  });
  for (const p of ["/ledger/inbound", "/inventory", "/entry", "/", "/parts"]) revalidatePath(p);
  return { ok: true, message: `${o.docNo} 를 삭제하고 재고·평균원가를 되돌렸습니다.` };
}

/** 엑셀 업로드 검증: 부품코드 존재 여부 */
export type InboundImportRow = { row: number; code: string; qty: number; unitPriceFx: number; error?: string; partId?: number; name?: string };

export async function validateInboundRows(rows: { row: number; code: string; qty: string; unitPriceFx: string }[]): Promise<ActionResult<InboundImportRow[]>> {
  await requireModule("parts");
  if (rows.length === 0) return { ok: false, error: "데이터 행이 없습니다." };
  if (rows.length > 500) return { ok: false, error: "한 전표에 500행까지 올릴 수 있습니다." };
  const codes = [...new Set(rows.map((r) => r.code.trim().toUpperCase()).filter(Boolean))];
  const found = codes.length ? await db.select({ id: parts.id, code: parts.code, name: parts.name, status: parts.status }).from(parts).where(inArray(parts.code, codes)) : [];
  const map = new Map(found.map((p) => [p.code, p]));
  const out: InboundImportRow[] = rows.map((r) => {
    const code = r.code.trim().toUpperCase();
    const qty = Number(r.qty);
    const fx = Number(r.unitPriceFx);
    const p = map.get(code);
    let error: string | undefined;
    if (!code) error = "부품코드가 비어 있습니다.";
    else if (!p) error = `부품코드 ${code} 가 마스터에 없습니다. 부품을 먼저 등록하세요.`;
    else if (p.status === "discontinued") error = `${code} 는 단종 상태입니다.`;
    else if (!Number.isInteger(qty) || qty <= 0) error = "수량은 1 이상의 정수여야 합니다.";
    else if (!(fx >= 0)) error = "외화단가는 0 이상 숫자여야 합니다.";
    return { row: r.row, code, qty, unitPriceFx: fx, error, partId: p?.id, name: p?.name };
  });
  return { ok: true, data: out };
}
