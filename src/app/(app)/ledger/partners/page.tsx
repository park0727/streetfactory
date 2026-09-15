import { PageHeader } from "@/components/page-header";

export const metadata = { title: "거래처 원장" };

export default function Page() {
  return (
    <>
      <PageHeader title="거래처 원장" description="거래처·기간별 출고 내역" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
