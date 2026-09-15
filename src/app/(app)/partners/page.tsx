import { PageHeader } from "@/components/page-header";

export const metadata = { title: "거래처" };

export default function Page() {
  return (
    <>
      <PageHeader title="거래처" description="국내 거래처와 실적" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
