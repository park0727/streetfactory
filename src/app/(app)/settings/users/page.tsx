import { PageHeader } from "@/components/page-header";

export const metadata = { title: "사용자 관리" };

export default function Page() {
  return (
    <>
      <PageHeader title="사용자 관리" description="계정 생성과 권한" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
