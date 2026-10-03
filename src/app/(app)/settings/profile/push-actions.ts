"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { notifyProfile, pushConfigured } from "@/lib/push-notify";
import type { ActionResult } from "@/lib/action-result";

const subSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(8) }),
  device: z.string().max(80).optional(),
});

export async function savePushSubscription(input: z.infer<typeof subSchema>): Promise<ActionResult> {
  const me = await requireUser();
  const r = subSchema.safeParse(input);
  if (!r.success) return { ok: false, error: "알림 등록 정보가 올바르지 않습니다." };
  const v = r.data;
  await db
    .insert(pushSubscriptions)
    .values({ profileId: me.id, endpoint: v.endpoint, p256dh: v.keys.p256dh, auth: v.keys.auth, device: v.device ?? null })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { profileId: me.id, p256dh: v.keys.p256dh, auth: v.keys.auth, device: v.device ?? null } });
  return { ok: true, message: "이 기기로 주문 알림을 받습니다." };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const me = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.profileId, me.id)));
  return { ok: true, message: "이 기기의 주문 알림을 껐습니다." };
}

export async function removeMyDevice(id: number): Promise<ActionResult> {
  const me = await requireUser();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.profileId, me.id)));
  return { ok: true, message: "기기를 알림에서 뺐습니다." };
}

export async function sendTestPush(): Promise<ActionResult> {
  const me = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "알림 키가 설정되지 않았습니다. 관리자에게 문의하세요." };
  const n = await notifyProfile(me.id, { title: "라이더매니아 알림 테스트", body: "이렇게 새 온라인 주문이 오면 알려 드립니다.", url: "/orders", tag: "test" });
  return n > 0 ? { ok: true, message: `기기 ${n}대로 테스트 알림을 보냈습니다.` } : { ok: false, error: "보낼 기기가 없거나 보내지 못했습니다. 알림을 다시 켜 주세요." };
}
