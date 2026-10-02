import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { getShopSettings } from "@/lib/shop";
import { PageHeader } from "@/components/page-header";
import { ShopSettingsForm } from "./form";
import { InstallGuide } from "./install-guide";

export const metadata = { title: "주문 화면 설정" };

export default async function ShopSettingsPage() {
  await requireAdmin();
  const s = await getShopSettings();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "streetfactory.park0727.workers.dev"}`;
  return (
    <>
      <PageHeader title="주문 화면 설정" description="거래처가 쓰는 주문 화면의 입금 안내, 공지, 거래명세서에 찍히는 회사 정보를 정합니다." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <ShopSettingsForm s={s} />
        <InstallGuide origin={origin} />
      </div>
    </>
  );
}
