import { PageHeader } from "@/components/page-header";

export const metadata = { title: "판매 원장" };

export default function Page() {
  return (
    <>
      <PageHeader title="판매 원장" description="모든 판매 전표" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
