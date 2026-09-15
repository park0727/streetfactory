import { requireModule } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ImportClient } from "./import-client";

export const metadata = { title: "부품 엑셀 업로드" };

export default async function PartsImportPage() {
  await requireModule("parts");
  return (
    <>
      <PageHeader
        eyebrow="부품 마스터"
        title="엑셀 일괄 업로드"
        description="템플릿에 채워서 올리면 검증 결과를 먼저 보여줍니다. 오류가 하나라도 있으면 아무것도 저장하지 않습니다."
      />
      <ImportClient />
    </>
  );
}
