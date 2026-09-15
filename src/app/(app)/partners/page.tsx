import { asc, desc, eq, ilike, or, sql, type SQL, and } from "drizzle-orm";
import { db } from "@/db";
import { partners, vPartnerStats, vSalesSettlement } from "@/db/schema";
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

  const bal = db
    .select({ partnerId: vSalesSettlement.partnerId, balance: sql<number>`sum(greatest(${vSalesSettlement.balance}, 0))::numeric`.as("balance") })
    .from(vSalesSettlement)
    .groupBy(vSalesSettlement.partnerId)
    .as("bal");
  const rows = await db
    .select({
      id: partners.id,
      code: partners.code,
      name: partners.name,
      type: partners.type,
      bizNo: partners.bizNo,
      defaultTerms: partners.defaultTerms,
      defaultVat: partners.defaultVat,
      contactName: partners.contactName,
      phone: partners.phone,
      email: partners.email,
      address: partners.address,
      memo: partners.memo,
      isActive: partners.isActive,
      orderCount: sql<number>`coalesce(${vPartnerStats.orderCount}, 0)`,
      totalAmount: sql<number>`coalesce(${vPartnerStats.totalAmount}, 0)`,
      lastDate: vPartnerStats.lastDate,
      balance: sql<number>`coalesce(${bal.balance}, 0)`,
    })
    .from(partners)
    .leftJoin(vPartnerStats, eq(vPartnerStats.partnerId, partners.id))
    .leftJoin(bal, eq(bal.partnerId, partners.id))
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
