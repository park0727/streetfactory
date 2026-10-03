import { asc } from "drizzle-orm";
import { db } from "@/db";
import { banners, categories } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { BannersClient } from "./banners-client";

export const metadata = { title: "광고 배너" };

export default async function BannersPage() {
  await requireModule("parts");
  const [rows, cats] = await Promise.all([
    db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.id)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  return (
    <>
      <PageHeader title="광고 배너" description="거래처 주문 화면 맨 위에 3초마다 넘어가며 보이는 사진입니다. 가로로 긴 사진(가로 2 : 세로 1)이 가장 잘 맞습니다." />
      <BannersClient rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} cats={cats} today={todayKST()} />
    </>
  );
}
