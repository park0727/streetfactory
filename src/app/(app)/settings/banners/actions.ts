"use server";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { banners } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { removeImageByUrl } from "@/lib/upload-actions";
import { firstIssue, type ActionResult } from "@/lib/action-result";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const schema = z.object({
  id: z.number().int().optional(),
  imageUrl: z.string().url("이미지를 올려 주세요."),
  title: z.string().trim().max(80).nullable(),
  linkUrl: z.string().trim().max(300).regex(/^\/shop/, "주문 화면 안의 주소만 넣을 수 있습니다.").nullable(),
  active: z.boolean(),
  startsOn: day,
  endsOn: day,
});
const refresh = () => ["/settings/banners", "/shop"].forEach((p) => revalidatePath(p));

export async function saveBanner(input: z.infer<typeof schema>): Promise<ActionResult> {
  await requireModule("parts");
  const r = schema.safeParse(input);
  if (!r.success) return { ok: false, error: firstIssue(r.error.issues) };
  const { id, ...v } = r.data;
  if (v.startsOn && v.endsOn && v.startsOn > v.endsOn) return { ok: false, error: "끝나는 날이 시작하는 날보다 앞설 수 없습니다." };
  if (id) {
    const [old] = await db.select({ imageUrl: banners.imageUrl }).from(banners).where(eq(banners.id, id));
    await db.update(banners).set(v).where(eq(banners.id, id));
    if (old && old.imageUrl !== v.imageUrl) await removeImageByUrl(old.imageUrl);
  } else {
    const all = await db.select({ id: banners.id }).from(banners);
    await db.insert(banners).values({ ...v, sortOrder: all.length + 1 });
  }
  refresh();
  return { ok: true, message: "배너를 저장했습니다." };
}

export async function deleteBanner(id: number): Promise<ActionResult> {
  await requireModule("parts");
  const [b] = await db.select({ imageUrl: banners.imageUrl }).from(banners).where(eq(banners.id, id));
  await db.delete(banners).where(eq(banners.id, id));
  await removeImageByUrl(b?.imageUrl);
  refresh();
  return { ok: true, message: "배너를 지웠습니다." };
}

/** 순서 바꾸기: dir = -1 위로, 1 아래로 */
export async function moveBanner(id: number, dir: -1 | 1): Promise<ActionResult> {
  await requireModule("parts");
  const all = await db.select({ id: banners.id }).from(banners).orderBy(asc(banners.sortOrder), asc(banners.id));
  const i = all.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await db.transaction(async (tx) => {
    for (const [k, b] of all.entries()) await tx.update(banners).set({ sortOrder: k + 1 }).where(eq(banners.id, b.id));
  });
  refresh();
  return { ok: true };
}
