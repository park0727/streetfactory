"use server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, parts, stockMovements, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { PART_STATUS_FROM_LABEL } from "@/lib/parts-shared";
import { partSchema } from "../schema";
import { PART_COLUMNS, type ImportRow, type RowResult, type ValidateResult } from "./columns";

const MAX_ROWS = 2000;

type Parsed = { row: number; data: z.infer<typeof partSchema>; category: string; supplier?: string; result: RowResult };

/** 헤더 한글 → 키 변환 후 zod 검증. DB 조회 없이 형식만 본다. */
function parseRows(rows: ImportRow[]) {
  const byHeader = new Map(PART_COLUMNS.map((c) => [c.header, c.key]));
  const out: Parsed[] = [];
  rows.forEach((raw, i) => {
    const rowNo = i + 2;
    const obj: Record<string, unknown> = {};
    for (const [h, v] of Object.entries(raw)) {
      const key = byHeader.get(h.trim());
      if (key && v !== "") obj[key] = v;
    }
    const statusLabel = typeof obj.status === "string" ? obj.status.trim() : "";
    if (statusLabel) obj.status = PART_STATUS_FROM_LABEL[statusLabel] ?? (["active", "paused", "discontinued"].includes(statusLabel) ? statusLabel : "__bad__");
    const category = String(obj.category ?? "").trim();
    const supplier = obj.supplier ? String(obj.supplier).trim() : undefined;
    const r = partSchema.safeParse({ ...obj, categoryId: 1 }); // categoryId 는 뒤에서 이름으로 치환
    const errors: string[] = [];
    if (!category) errors.push("카테고리가 비어 있습니다.");
    if (obj.status === "__bad__") errors.push(`운영상태는 운영중/일시품절/단종 중 하나여야 합니다 (입력: ${statusLabel}).`);
    if (!r.success)
      errors.push(
        ...r.error.issues
          .filter((is) => !(is.path[0] === "status" && obj.status === "__bad__"))
          .map((is) => `${labelOf(String(is.path[0]))}: ${is.message}`),
      );
    out.push({
      row: rowNo,
      data: r.success ? r.data : (undefined as unknown as z.infer<typeof partSchema>),
      category,
      supplier,
      result: { row: rowNo, code: String(obj.code ?? "").toUpperCase(), action: errors.length ? "error" : "insert", errors, notes: [] },
    });
  });
  return out;
}

function labelOf(key: string) {
  return PART_COLUMNS.find((c) => c.key === key)?.header ?? key;
}

/** DB 와 대조: 신규/수정 판정, 중복 코드, 신규 카테고리·공급사 */
async function resolve(parsed: Parsed[]) {
  const codes = parsed.map((p) => p.result.code).filter(Boolean);
  const existing = codes.length ? await db.select({ code: parts.code }).from(parts).where(inArray(parts.code, codes)) : [];
  const existingSet = new Set(existing.map((e) => e.code));
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories);
  const sups = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
  const catMap = new Map(cats.map((c) => [c.name, c.id]));
  const supMap = new Map(sups.map((s) => [s.name, s.id]));

  const seen = new Set<string>();
  const newCategories = new Set<string>();
  const newSuppliers = new Set<string>();
  for (const p of parsed) {
    const res = p.result;
    if (res.action === "error") continue;
    if (seen.has(res.code)) {
      res.action = "error";
      res.errors.push("파일 안에 같은 부품코드가 두 번 있습니다.");
      continue;
    }
    seen.add(res.code);
    if (existingSet.has(res.code)) {
      res.action = "update";
      if (p.data.openingQty && p.data.openingQty > 0) {
        res.action = "error";
        res.errors.push("이미 등록된 부품에는 기초재고를 넣을 수 없습니다. 재고 현황의 실사 조정을 쓰세요.");
        continue;
      }
    }
    if (!catMap.has(p.category)) {
      newCategories.add(p.category);
      res.notes.push(`카테고리 '${p.category}' 신규 생성`);
    }
    if (p.supplier && !supMap.has(p.supplier)) {
      newSuppliers.add(p.supplier);
      res.notes.push(`공급사 '${p.supplier}' 신규 생성`);
    }
  }
  return { catMap, supMap, newCategories: [...newCategories], newSuppliers: [...newSuppliers] };
}

function summarize(parsed: Parsed[], newCategories: string[], newSuppliers: string[]): ValidateResult {
  const rows = parsed.map((p) => p.result);
  return {
    rows,
    newCategories,
    newSuppliers,
    inserts: rows.filter((r) => r.action === "insert").length,
    updates: rows.filter((r) => r.action === "update").length,
    errors: rows.filter((r) => r.action === "error").length,
  };
}

export async function validatePartsImport(rows: ImportRow[]): Promise<ActionResult<ValidateResult>> {
  await requireModule("parts");
  if (rows.length === 0) return { ok: false, error: "데이터 행이 없습니다." };
  if (rows.length > MAX_ROWS) return { ok: false, error: `한 번에 ${MAX_ROWS}행까지 올릴 수 있습니다.` };
  const parsed = parseRows(rows);
  const { newCategories, newSuppliers } = await resolve(parsed);
  return { ok: true, data: summarize(parsed, newCategories, newSuppliers) };
}

export async function commitPartsImport(rows: ImportRow[]): Promise<ActionResult<{ inserts: number; updates: number }>> {
  const me = await requireModule("parts");
  if (rows.length === 0 || rows.length > MAX_ROWS) return { ok: false, error: "행 수가 올바르지 않습니다." };
  const parsed = parseRows(rows);
  const { catMap, supMap, newCategories, newSuppliers } = await resolve(parsed);
  const summary = summarize(parsed, newCategories, newSuppliers);
  if (summary.errors > 0) return { ok: false, error: `오류 ${summary.errors}건이 있어 저장하지 않았습니다. 미리보기에서 확인하세요.` };

  const today = new Date().toISOString().slice(0, 10);
  await db.transaction(async (tx) => {
    for (const name of newCategories) {
      const [c] = await tx.insert(categories).values({ name, sortOrder: 99 }).returning({ id: categories.id });
      catMap.set(name, c.id);
    }
    for (const name of newSuppliers) {
      const country = parsed.find((p) => p.supplier === name)?.data.country ?? "-";
      const [s] = await tx.insert(suppliers).values({ name, country }).returning({ id: suppliers.id });
      supMap.set(name, s.id);
    }
    for (const p of parsed) {
      const d = p.data;
      const values = {
        name: d.name,
        categoryId: catMap.get(p.category)!,
        spec: d.spec ?? null,
        manufacturer: d.manufacturer ?? null,
        country: d.country ?? null,
        supplierId: p.supplier ? (supMap.get(p.supplier) ?? null) : null,
        standardCost: d.standardCost,
        retailPrice: d.retailPrice,
        safetyStock: d.safetyStock,
        status: d.status,
        memo: d.memo ?? null,
      };
      if (p.result.action === "update") {
        await tx.update(parts).set(values).where(eq(parts.code, p.result.code));
      } else {
        const unit = d.openingUnitCost ?? d.standardCost;
        const [row] = await tx.insert(parts).values({ ...values, code: p.result.code, avgCost: unit }).returning({ id: parts.id });
        if (d.openingQty && d.openingQty > 0) {
          await tx.insert(stockMovements).values({ partId: row.id, type: "opening", qty: d.openingQty, unitCost: unit, occurredAt: today, memo: "기초재고(엑셀 업로드)", createdBy: me.id });
        }
      }
    }
  });
  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/settings/master");
  return { ok: true, message: `신규 ${summary.inserts}건, 수정 ${summary.updates}건을 저장했습니다.`, data: { inserts: summary.inserts, updates: summary.updates } };
}
