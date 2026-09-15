import { asc, desc, eq, ilike, or, sql, type SQL, and } from "drizzle-orm";
import { db } from "@/db";
import { partners, vPartnerStats } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { str } from "@/lib/query-params";
import { PageHeader, Panel } from "@/components/page-header";
import { PartnersTable, NewPartnerButton } from "./partners-table";
import { PartnersToolbar } from "./toolbar";

export const metadata = { title: "거래처" };

export default async function PartnersPage({ searchParams }: PageProps<"/partners">) {
  await requireModule("parts");
  const sp = await searchParams;
  const q = str(sp, "q");
  const type = str(sp, "type");
  const inactive = str(sp, "inactive") === "1";
  const conds: SQL[] = [];
  if (q) conds.push(or(ilike(partners.name, `%${q}%`), ilike(partners.code, `%${q}%`), ilike(partners.contactName, `%${q}%`), ilike(partners.bizNo, `%${q.replace(/\D/g, "")}%`))!);
  if (["dealer", "service_center", "direct_store", "online_mall", "other"].includes(type)) conds.push(eq(partners.type, type as typeof partners.$inferSelect.type));
  if (!inactive) conds.push(eq(partners.isActive, true));

  const rows = await db
    .select({
      id: partners.id,
      code: partners.code,
      name: partners.name,
      type: partners.type,
      bizNo: partners.bizNo,
      contactName: partners.contactName,
      phone: partners.phone,
      email: partners.email,
      address: partners.address,
      memo: partners.memo,
      isActive: partners.isActive,
      orderCount: sql<number>`coalesce(${vPartnerStats.orderCount}, 0)`,
      totalAmount: sql<number>`coalesce(${vPartnerStats.totalAmount}, 0)`,
      lastDate: vPartnerStats.lastDate,
    })
    .from(partners)
    .leftJoin(vPartnerStats, eq(vPartnerStats.partnerId, partners.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(sql`coalesce(${vPartnerStats.totalAmount}, 0)`), asc(partners.name));

  return (
    <>
      <PageHeader title="거래처" description="국내 대리점·정비센터·직영점·온라인몰. 실적은 판매 원장에서 자동 집계됩니다." actions={<NewPartnerButton />} />
      <PartnersToolbar />
      <Panel className="mt-3 overflow-hidden">
        <PartnersTable rows={rows} />
      </Panel>
    </>
  );
}
