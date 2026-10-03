import { redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCustomer, getShopSettings } from "@/lib/shop";
import { ContactCall } from "../../contact-call";
import { InstallApp } from "@/components/install-app";
import { ShopLoginForm } from "./form";

export const metadata = { title: "로그인" };

export default async function ShopLoginPage() {
  if (await getCustomer()) redirect("/");
  const settings = await getShopSettings();
  return (
    <main className="flex min-h-svh flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-1 flex-col justify-end px-6 pt-16 pb-8">
        <Brand size="md" className="text-white" />
        <h1 className="mt-6 font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-white text-balance">
          거래처 전용
          <br />
          부품 주문
        </h1>
        <p className="mt-3 max-w-xs text-sm text-sidebar-foreground/70">라이더매니아에서 발급한 주문 계정으로 로그인하세요. 실시간 재고 기준으로 주문할 수 있습니다.</p>
      </div>
      <div className="rounded-t-2xl bg-card px-6 pt-7 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-foreground">
        <div className="mx-auto w-full max-w-sm">
          <ShopLoginForm />
          <div className="mt-5 rounded-md border border-signal/40 bg-signal/5 p-4">
            <p className="text-[14.5px] font-semibold">처음 오셨나요?</p>
            <p className="mt-0.5 text-[13px] text-steel">오토바이 가게·정비점이라면 거래처로 가입 신청해 주세요. 승인되면 바로 주문할 수 있습니다.</p>
            <Button asChild className="mt-3 h-11 w-full bg-signal text-base text-white hover:bg-signal/90">
              <Link href="/signup">거래처 가입 신청</Link>
            </Button>
          </div>
          <InstallApp className="mt-4" />
          <p className="mt-6 text-xs text-steel">비밀번호를 잊었으면 라이더매니아 담당자에게 연락하세요.</p>
          <ContactCall phone={settings?.phone} className="mt-2 text-sm" />
        </div>
      </div>
    </main>
  );
}
