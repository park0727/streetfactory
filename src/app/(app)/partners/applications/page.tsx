import Link from "next/link";
import { asc, desc, eq, ne } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { partnerApplications, partners } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/page-header";
import { ApplicationsClient, type AppRow } from "./applications-client";

export const metadata = { title: "거래처 가입 신청" };

export default async function ApplicationsPage() {
  await requireModule("parts");
  const [pending, done, partnerList] = await Promise.all([
    db.select().from(partnerApplications).where(eq(partnerApplications.status, "pending")).orderBy(asc(partnerApplications.createdAt)),
    db
      .select({ a: partnerApplications, partnerName: partners.name })
      .from(partnerApplications)
      .leftJoin(partners, eq(partners.id, partnerApplications.partnerId))
      .where(ne(partnerApplications.status, "pending"))
      .orderBy(desc(partnerApplications.reviewedAt))
      .limit(30),
    db.select({ id: partners.id, code: partners.code, name: partners.name, bizNo: partners.bizNo, phone: partners.phone, isActive: partners.isActive }).from(partners).orderBy(asc(partners.name)),
  ]);
  const toRow = (a: typeof partnerApplications.$inferSelect, partnerName: string | null = null): AppRow => ({
    id: a.id,
    email: a.email,
    companyName: a.companyName,
    bizNo: a.bizNo,
    contactName: a.contactName,
    phone: a.phone,
    address: a.address,
    memo: a.memo,
    status: a.status,
    rejectReason: a.rejectReason,
    createdAt: a.createdAt.toISOString(),
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    partnerName,
  });
  return (
    <>
      <Link href="/partners" className="mb-2 inline-flex items-center gap-1 text-[13px] text-steel hover:text-foreground">
        <ArrowLeft className="size-4" /> 거래처
      </Link>
      <PageHeader title="거래처 가입 신청" description="주문 화면에서 들어온 가입 신청입니다. 승인하면 거래처가 등록되고, 신청자가 정한 이메일·비밀번호로 바로 주문할 수 있습니다." />
      <ApplicationsClient pending={pending.map((a) => toRow(a))} partners={partnerList} />
      {done.length > 0 && (
        <Panel className="mt-6 p-0">
          <p className="border-b px-4 py-2.5 text-[13.5px] font-semibold">처리한 신청 (최근 30건)</p>
          <ul className="divide-y text-[13px]">
            {done.map(({ a, partnerName }) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2">
                <span className={a.status === "approved" ? "font-medium text-status-ok" : "font-medium text-status-critical"}>{a.status === "approved" ? "승인" : "거절"}</span>
                <span className="font-medium">{a.companyName}</span>
                <span className="text-steel">{a.contactName} · {a.phone} · {a.email}</span>
                {a.status === "approved" && partnerName && <span className="text-steel">→ {partnerName}</span>}
                {a.status === "rejected" && a.rejectReason && <span className="text-steel">사유: {a.rejectReason}</span>}
                <span className="ml-auto text-[12px] text-steel">{a.reviewedAt?.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
