import { asc, desc, eq, ilike, or, sql, type SQL, and } from "drizzle-orm";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { db } from "@/db";
import { Button } from "@/components/ui/button";
import { customerAccounts, partnerApplications, partners, vPartnerStats, vSalesSettlement } from "@/db/schema";
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
      priceTier: partners.priceTier,
      discountRate: partners.discountRate,
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

  const [{ n: signups }] = await db.select({ n: sql<number>`count(*)::int` }).from(partnerApplications).where(eq(partnerApplications.status, "pending"));
  const accounts = await db
    .select({ id: customerAccounts.id, partnerId: customerAccounts.partnerId, name: customerAccounts.name, email: customerAccounts.email, isActive: customerAccounts.isActive, mustChangePassword: customerAccounts.mustChangePassword })
    .from(customerAccounts)
    .orderBy(asc(customerAccounts.createdAt));
  return (
    <>
      <PageHeader title="거래처" description="국내 대리점·정비센터·직영점·온라인몰. 실적은 판매 원장에서 자동 집계됩니다." actions={
          <div className="flex gap-2">
            <Button asChild variant={signups > 0 ? "default" : "outline"} className={signups > 0 ? "bg-status-critical text-white hover:bg-status-critical/90" : ""}>
              <Link href="/partners/applications">
                <UserPlus /> 가입 신청{signups > 0 && ` ${signups}건`}
              </Link>
            </Button>
            <NewPartnerButton />
          </div>
        }
      />
      <PartnersToolbar />
      <Panel className="mt-3 overflow-hidden">
        <PartnersTable rows={rows} accounts={accounts} />
      </Panel>
    </>
  );
}
