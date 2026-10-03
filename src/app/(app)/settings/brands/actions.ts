"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { removeImageByUrl } from "@/lib/upload-actions";
import { dbErrorMessage, firstIssue, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, "브랜드 이름을 입력하세요.").max(40),
  logoUrl: z.string().url().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

function refresh() {
  ["/settings/brands", "/parts", "/shop"].forEach((p) => revalidatePath(p));
}

export async function saveBrand(input: z.infer<typeof schema>): Promise<ActionResult> {
  await requireModule("parts");
  const r = schema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, ...v } = r.data;
  try {
    if (id) {
      const [old] = await db.select({ logoUrl: brands.logoUrl }).from(brands).where(eq(brands.id, id));
      await db.update(brands).set(v).where(eq(brands.id, id));
      if (old?.logoUrl && old.logoUrl !== v.logoUrl) await removeImageByUrl(old.logoUrl);
    } else await db.insert(brands).values(v);
  } catch (e) {
    const m = dbErrorMessage(e);
    return { ok: false, error: m === "이미 존재하는 값입니다." ? "같은 이름의 브랜드가 이미 있습니다." : m };
  }
  refresh();
  return { ok: true, message: "브랜드를 저장했습니다." };
}

export async function deleteBrand(id: number): Promise<ActionResult> {
  await requireModule("parts");
  const [b] = await db.select({ logoUrl: brands.logoUrl }).from(brands).where(eq(brands.id, id));
  await db.delete(brands).where(eq(brands.id, id)); // 부품의 브랜드는 비워진다
  await removeImageByUrl(b?.logoUrl);
  refresh();
  return { ok: true, message: "브랜드를 지웠습니다." };
}
