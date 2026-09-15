"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, parts, salesChannels, suppliers, inboundOrders } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";

const PATH = "/settings/master";

const simpleSchema = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().trim().min(1, "이름을 입력하세요.").max(50),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const supplierSchema = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().trim().min(1, "공급사명을 입력하세요.").max(100),
  country: z.string().trim().min(1, "국가를 입력하세요.").max(50),
  contact: z.string().trim().max(200).optional(),
  memo: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
});

function parse<T extends z.ZodTypeAny>(schema: T, fd: FormData): { data: z.infer<T> } | { error: string } {
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v === "true" ? true : v === "false" ? false : v));
  const r = schema.safeParse(raw);
  return r.success ? { data: r.data } : { error: firstIssue(r.error.issues) };
}

// ---------- 카테고리 ----------
export async function saveCategory(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireModule("parts");
  const p = parse(simpleSchema, fd);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, name, sortOrder } = p.data;
  try {
    if (id) await db.update(categories).set({ name, sortOrder }).where(eq(categories.id, id));
    else await db.insert(categories).values({ name, sortOrder });
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  revalidatePath(PATH);
  return { ok: true, message: "저장했습니다." };
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  await requireModule("parts");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(parts).where(eq(parts.categoryId, id));
  if (n > 0) return { ok: false, error: `이 카테고리를 쓰는 부품이 ${n}개 있어 삭제할 수 없습니다.` };
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath(PATH);
  return { ok: true, message: "삭제했습니다." };
}

// ---------- 판매채널 ----------
export async function saveChannel(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireModule("parts");
  const p = parse(simpleSchema, fd);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, name, sortOrder } = p.data;
  try {
    if (id) await db.update(salesChannels).set({ name, sortOrder }).where(eq(salesChannels.id, id));
    else await db.insert(salesChannels).values({ name, sortOrder });
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  revalidatePath(PATH);
  return { ok: true, message: "저장했습니다." };
}

export async function deleteChannel(id: number): Promise<ActionResult> {
  await requireModule("parts");
  // 판매 전표의 channel 은 텍스트 스냅샷이라 삭제해도 원장은 유지된다.
  await db.delete(salesChannels).where(eq(salesChannels.id, id));
  revalidatePath(PATH);
  return { ok: true, message: "삭제했습니다." };
}

// ---------- 공급사 ----------
export async function saveSupplier(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireModule("parts");
  fd.set("isActive", fd.get("isActive") === "true" ? "true" : "false"); // 체크 해제 시 값이 실리지 않는다
  const p = parse(supplierSchema, fd);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, ...values } = p.data;
  try {
    if (id) await db.update(suppliers).set(values).where(eq(suppliers.id, id));
    else await db.insert(suppliers).values(values);
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  revalidatePath(PATH);
  return { ok: true, message: "저장했습니다." };
}

export async function deleteSupplier(id: number): Promise<ActionResult> {
  await requireModule("parts");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(inboundOrders).where(eq(inboundOrders.supplierId, id));
  if (n > 0) return { ok: false, error: `입고 전표 ${n}건이 이 공급사를 참조합니다. 삭제 대신 '사용 안 함'으로 바꾸세요.` };
  await db.update(parts).set({ supplierId: null }).where(eq(parts.supplierId, id));
  await db.delete(suppliers).where(eq(suppliers.id, id));
  revalidatePath(PATH);
  return { ok: true, message: "삭제했습니다." };
}
