import { PageHeader } from "@/components/page-header";

export const metadata = { title: "재고 현황" };

export default function Page() {
  return (
    <>
      <PageHeader title="재고 현황" description="실시간 가용재고와 안전재고 상태" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
