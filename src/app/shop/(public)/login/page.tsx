import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCustomer } from "@/lib/shop";
import { getProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { shopLogout } from "../../actions";
import { InstallApp } from "../../install-app";
import { ShopLoginForm } from "./form";

export const metadata = { title: "로그인" };

export default async function ShopLoginPage() {
  if (await getCustomer()) redirect("/shop");
  const staff = await getProfile();
  return (
    <main className="flex min-h-svh flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-1 flex-col justify-end px-6 pt-16 pb-8">
        <Brand size="md" className="text-white" />
        <h1 className="mt-6 font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-white text-balance">
          거래처 전용
          <br />
          부품 주문
        </h1>
        <p className="mt-3 max-w-xs text-sm text-sidebar-foreground/70">Streetfactory 에서 발급한 주문 계정으로 로그인하세요. 실시간 재고 기준으로 주문할 수 있습니다.</p>
      </div>
      <div className="rounded-t-2xl bg-card px-6 pt-7 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-foreground">
        <div className="mx-auto w-full max-w-sm">
          {staff ? (
            <div className="space-y-3">
              <p className="text-[15px] font-medium">{staff.name}님은 직원 계정으로 로그인되어 있습니다.</p>
              <p className="text-sm text-steel">주문 화면은 거래처 계정으로 들어갑니다. 업무 화면으로 돌아가거나, 로그아웃한 뒤 거래처 계정으로 로그인하세요.</p>
              <Button asChild className="h-11 w-full text-base">
                <Link href="/">관리자 화면으로 돌아가기</Link>
              </Button>
              <form action={shopLogout}>
                <Button type="submit" variant="outline" className="h-11 w-full text-base">로그아웃하고 거래처 계정으로 로그인</Button>
              </form>
            </div>
          ) : (
            <ShopLoginForm />
          )}
          <InstallApp className="mt-4" />
          <p className="mt-6 text-xs text-steel">계정이 없거나 비밀번호를 잊었으면 Streetfactory 담당자에게 연락하세요.</p>
          <a href="/login" className="mt-3 inline-block text-xs text-steel underline underline-offset-2">Streetfactory 직원이신가요? 관리자 화면으로</a>
        </div>
      </div>
    </main>
  );
}
