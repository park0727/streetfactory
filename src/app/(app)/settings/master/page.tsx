import { PageHeader } from "@/components/page-header";

export const metadata = { title: "기준 데이터" };

export default function Page() {
  return (
    <>
      <PageHeader title="기준 데이터" description="카테고리, 공급사, 판매채널" />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">준비 중</div>
    </>
  );
}
