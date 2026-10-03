"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customerAccounts, parts, profiles, vAvailable, webOrderLines, webOrders } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireCustomer } from "@/lib/shop";
import { availability, priceFor, type Availability } from "@/lib/pricing";
import { firstIssue, type ActionResult } from "@/lib/action-result";
import { todayKST } from "@/lib/dates";
import { nextDocNo } from "../(app)/entry/sale-core";

// ---------- 로그인 ----------
export type ShopLoginState = { error?: string; goto?: { href: string; label: string } } | undefined;

export async function shopLogin(_: ShopLoginState, fd: FormData): Promise<ShopLoginState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  const [c] = await db.select({ active: customerAccounts.isActive, must: customerAccounts.mustChangePassword }).from(customerAccounts).where(eq(customerAccounts.id, data.user.id));
  if (!c) {
    const [staff] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, data.user.id));
    await supabase.auth.signOut();
    return staff
      ? { error: "이 계정은 직원용 계정입니다. 아래 버튼을 눌러 관리자 화면에서 로그인해 주세요.", goto: { href: "/login", label: "관리자 화면으로 가기" } }
      : { error: "주문할 수 있는 계정이 아닙니다. 라이더매니아 담당자에게 연락해 주세요." };
  }
  if (!c.active) {
    await supabase.auth.signOut();
    return { error: "사용이 중지된 계정입니다. 담당자에게 문의하세요." };
  }
  redirect(c.must ? "/shop/account?pw=1" : "/shop");
}

export async function shopLogout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/shop/login");
}

// ---------- 장바구니 견적 ----------
export type QuoteLine = { partId: number; code: string; name: string; spec: string | null; price: number; availability: Availability; orderable: boolean; ok: boolean };

/** 장바구니 수량을 현재 가격·가용재고로 확인한다. 실제 재고 수량은 돌려주지 않는다. */
export async function quoteCart(items: { partId: number; qty: number }[]): Promise<QuoteLine[]> {
  const me = await requireCustomer();
  const ids = [...new Set(items.map((i) => i.partId))].filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: parts.id, code: parts.code, name: parts.name, spec: parts.spec, retailPrice: parts.retailPrice, wholesalePrice: parts.wholesalePrice, online: parts.online, status: parts.status, available: vAvailable.available })
    .from(parts)
    .innerJoin(vAvailable, eq(vAvailable.partId, parts.id))
    .where(inArray(parts.id, ids));
  const map = new Map(rows.map((r) => [r.id, r]));
  return items
    .filter((i) => map.has(i.partId))
    .map((i) => {
      const r = map.get(i.partId)!;
      const orderable = r.online && r.status === "active";
      return {
        partId: r.id,
        code: r.code,
        name: r.name,
        spec: r.spec,
        price: priceFor(r, me),
        availability: availability(orderable ? r.available : 0, r.status),
        orderable,
        ok: orderable && i.qty <= r.available,
      };
    });
}

// ---------- 주문 ----------
const orderSchema = z.object({
  memo: z.string().trim().max(300).optional(),
  lines: z
    .array(z.object({ partId: z.number().int().positive(), qty: z.number().int().positive("수량은 1 이상이어야 합니다.").max(9999) }))
    .min(1, "장바구니가 비어 있습니다.")
    .max(100, "한 번에 100개 품목까지 주문할 수 있습니다."),
});

export async function placeOrder(input: z.infer<typeof orderSchema>): Promise<ActionResult<{ id: number; orderNo: string }>> {
  const me = await requireCustomer();
  const r = orderSchema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  // 같은 부품 합치기
  const need = new Map<number, number>();
  for (const l of r.data.lines) need.set(l.partId, (need.get(l.partId) ?? 0) + l.qty);

  try {
    const result = await db.transaction(async (tx) => {
      // 주문끼리 가용재고를 동시에 잡지 않도록 직렬화
      await tx.execute(sql`select pg_advisory_xact_lock(7340001)`);
      const rows = await tx
        .select({ id: parts.id, code: parts.code, name: parts.name, retailPrice: parts.retailPrice, wholesalePrice: parts.wholesalePrice, online: parts.online, status: parts.status, available: vAvailable.available })
        .from(parts)
        .innerJoin(vAvailable, eq(vAvailable.partId, parts.id))
        .where(inArray(parts.id, [...need.keys()]));
      const map = new Map(rows.map((x) => [x.id, x]));
      const problems: string[] = [];
      for (const [id, qty] of need) {
        const p = map.get(id);
        if (!p || !p.online || p.status !== "active") problems.push(`${p?.name ?? "알 수 없는 부품"}: 지금 주문할 수 없는 상품입니다`);
        else if (qty > p.available) problems.push(`${p.name}: 주문 가능 수량을 초과했습니다`);
      }
      if (problems.length) throw new OrderError(problems.join(" · "));

      const orderNo = await nextDocNo(tx, "WEB", todayKST());
      const [o] = await tx
        .insert(webOrders)
        .values({ orderNo, partnerId: me.partnerId, customerId: me.id, vatApplied: me.vatApplied, memo: r.data.memo ?? null })
        .returning({ id: webOrders.id });
      await tx.insert(webOrderLines).values([...need].map(([partId, qty], i) => ({ orderId: o.id, lineNo: i + 1, partId, qty, unitPrice: priceFor(map.get(partId)!, me) })));
      return { id: o.id, orderNo };
    });
    revalidatePath("/shop/orders");
    revalidatePath("/orders");
    return { ok: true, message: `${result.orderNo} 주문이 접수되었습니다.`, data: result };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
}
class OrderError extends Error {}

export async function cancelMyOrder(id: number): Promise<ActionResult> {
  const me = await requireCustomer();
  const res = await db
    .update(webOrders)
    .set({ status: "cancelled", cancelReason: "고객 취소", processedAt: new Date() })
    .where(and(eq(webOrders.id, id), eq(webOrders.partnerId, me.partnerId), eq(webOrders.status, "pending")))
    .returning({ orderNo: webOrders.orderNo });
  if (res.length === 0) return { ok: false, error: "이미 처리되었거나 취소할 수 없는 주문입니다." };
  revalidatePath("/shop/orders");
  revalidatePath("/orders");
  return { ok: true, message: `${res[0].orderNo} 주문을 취소했습니다.` };
}

// ---------- 비밀번호 ----------
const pwSchema = z
  .object({ password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "비밀번호가 일치하지 않습니다." });

export async function changeMyPassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const me = await requireCustomer();
  const r = pwSchema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { error } = await createSupabaseAdmin().auth.admin.updateUserById(me.id, { password: r.data.password });
  if (error) return { ok: false, error: /different|same/i.test(error.message) ? "이전과 다른 비밀번호를 사용하세요." : `변경 실패: ${error.message}` };
  await db.update(customerAccounts).set({ mustChangePassword: false }).where(eq(customerAccounts.id, me.id));
  return { ok: true, message: "비밀번호를 변경했습니다." };
}
