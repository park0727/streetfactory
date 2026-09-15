"use server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().trim().min(1, "거래처명을 입력하세요.").max(100),
  type: z.enum(["dealer", "service_center", "direct_store", "online_mall", "other"]).default("dealer"),
  contactName: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(100).optional(),
  address: z.string().trim().max(200).optional(),
  memo: z.string().trim().max(500).optional(),
  isActive: z.coerce.boolean().default(true),
});

export async function savePartner(_: unknown, fd: FormData): Promise<ActionResult> {
  await requireModule("parts");
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" ? undefined : v));
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, ...v } = r.data;
  const values = { name: v.name, type: v.type, contactName: v.contactName ?? null, phone: v.phone ?? null, email: v.email ?? null, address: v.address ?? null, memo: v.memo ?? null, isActive: v.isActive };
  try {
    if (id) await db.update(partners).set(values).where(eq(partners.id, id));
    else {
      await db.transaction(async (tx) => {
        const r = await tx.execute(sql`select public.fn_next_seq('P', 0) as n`);
        const n = Number((r as unknown as { n: number }[])[0]?.n ?? (r as unknown as { rows?: { n: number }[] }).rows?.[0]?.n);
        await tx.insert(partners).values({ ...values, code: `P-${String(n).padStart(4, "0")}` });
      });
    }
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  revalidatePath("/partners");
  revalidatePath("/entry");
  return { ok: true, message: "저장했습니다." };
}
