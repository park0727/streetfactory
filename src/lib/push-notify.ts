import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { profiles, pushSubscriptions } from "@/db/schema";
import { sendPush, type PushMessage } from "@/lib/webpush";

function keys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: "mailto:admin@ridermania.co.kr" };
}

export const pushConfigured = () => keys() !== null;

/** 구독 목록으로 발송. 만료된 구독은 지운다. 반환: 성공 기기 수 */
async function deliver(subs: (typeof pushSubscriptions.$inferSelect)[], msg: PushMessage) {
  const k = keys();
  if (!k || subs.length === 0) return 0;
  const results = await Promise.allSettled(subs.map((s) => sendPush(s, msg, k)));
  const gone: number[] = [];
  const okIds: number[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      if (r.value.ok) okIds.push(subs[i].id);
      else if (r.value.gone) gone.push(subs[i].id);
      else console.error("[push] 실패", r.value.status, r.value.text.slice(0, 200));
    } else console.error("[push] 오류", r.reason);
  });
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  if (okIds.length) await db.update(pushSubscriptions).set({ lastSuccessAt: new Date() }).where(inArray(pushSubscriptions.id, okIds));
  return okIds.length;
}

/** 부품 업무를 하는 활성 직원 모두에게 */
export async function notifyStaff(msg: PushMessage) {
  const subs = await db
    .select({ s: pushSubscriptions })
    .from(pushSubscriptions)
    .innerJoin(profiles, eq(profiles.id, pushSubscriptions.profileId))
    .where(and(eq(profiles.isActive, true), or(eq(profiles.role, "admin"), eq(profiles.canParts, true))));
  return deliver(
    subs.map((x) => x.s),
    msg,
  );
}

export async function notifyProfile(profileId: string, msg: PushMessage) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.profileId, profileId));
  return deliver(subs, msg);
}
