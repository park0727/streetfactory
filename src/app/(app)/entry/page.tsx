import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partners, salesChannels, suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EntryClient } from "./entry-client";
import { RecentFeedPanel } from "./recent-feed";
import { recentFeed } from "./actions";

export const metadata = { title: "입출고 등록" };

export default async function EntryPage() {
  const me = await requireModule("parts");
  const [ps, ss, cs, feed] = await Promise.all([
    db.select({ id: partners.id, name: partners.name, type: partners.type, code: partners.code, defaultTerms: partners.defaultTerms, defaultVat: partners.defaultVat }).from(partners).where(eq(partners.isActive, true)).orderBy(asc(partners.name)),
    db.select({ id: suppliers.id, name: suppliers.name, country: suppliers.country }).from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name)),
    db.select({ name: salesChannels.name }).from(salesChannels).orderBy(asc(salesChannels.sortOrder)),
    recentFeed(),
  ]);
  const { now, today } = feed;

  return (
    <>
      <PageHeader title="입출고 등록" description="출고는 재고를 차감하고 판매 원장에, 입고는 평균원가를 갱신하고 입고 원장에 기록됩니다." />
      <EntryClient partners={ps} suppliers={ss} channels={cs.map((c) => c.name)} isAdmin={me.role === "admin"} today={today} />
      <div className="mt-5">
        <RecentFeedPanel feed={feed} now={now} />
      </div>
    </>
  );
}
