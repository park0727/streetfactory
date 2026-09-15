import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { todayKST } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { InboundImportClient } from "./import-client";

export const metadata = { title: "입고 엑셀 업로드" };

export default async function InboundImportPage() {
  await requireModule("parts");
  const ss = await db.select({ id: suppliers.id, name: suppliers.name, country: suppliers.country }).from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name));
  return (
    <>
      <PageHeader eyebrow="입고 원장" title="엑셀로 입고 등록" description="파일 하나가 입고 전표 하나가 됩니다. 전표 공통 항목은 아래에서 입력하고, 부품 라인은 엑셀에서 읽습니다." />
      <InboundImportClient suppliers={ss} today={todayKST()} />
    </>
  );
}
