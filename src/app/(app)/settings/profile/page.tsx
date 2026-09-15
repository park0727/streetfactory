import { PageHeader } from "@/components/page-header";

export const metadata = { title: "내 정보" };

export default function Page() {
  return (
    <>
      <PageHeader title="내 정보" description="비밀번호 변경" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
