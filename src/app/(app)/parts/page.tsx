import { PageHeader } from "@/components/page-header";

export const metadata = { title: "부품 마스터" };

export default function Page() {
  return (
    <>
      <PageHeader title="부품 마스터" description="부품 기준정보(SSOT) 관리" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
