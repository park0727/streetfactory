import { PageHeader } from "@/components/page-header";

export const metadata = { title: "입고 원장" };

export default function Page() {
  return (
    <>
      <PageHeader title="입고 원장" description="모든 수입 입고 전표" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
