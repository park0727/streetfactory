import { asc } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { UserTable } from "./user-table";

export const metadata = { title: "사용자 관리" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const rows = await db.select().from(profiles).orderBy(asc(profiles.createdAt));
  return (
    <>
      <PageHeader title="사용자 관리" description="직원 계정을 만들고 역할과 접근 모듈을 지정합니다." />
      <UserTable meId={me.id} rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </>
  );
}
