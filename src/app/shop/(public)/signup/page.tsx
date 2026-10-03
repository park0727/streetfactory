import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCustomer, getShopSettings } from "@/lib/shop";
import { ContactCall } from "../../contact-call";
import { SignupForm } from "./form";

export const metadata = { title: "거래처 가입 신청" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getCustomer()) redirect("/");
  const done = (await searchParams).done === "1";
  const settings = await getShopSettings();
  return (
    <main className="min-h-svh bg-background">
      <header className="bg-sidebar text-sidebar-foreground" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto max-w-lg px-5 pt-6 pb-7">
          <Brand href="/login" size="md" className="text-white" />
          <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight tracking-tight text-white">거래처 가입 신청</h1>
          <p className="mt-2 text-[14px] text-sidebar-foreground/75">오토바이 가게·정비점이라면 신청해 주세요. 확인 후 승인되면 신청하신 이메일로 바로 주문할 수 있습니다.</p>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-5 py-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {done ? (
          <div className="space-y-4">
            <div className="rounded-md border border-status-ok/30 bg-status-ok/5 p-5">
              <p className="flex items-center gap-2 text-[17px] font-semibold text-status-ok">
                <CheckCircle2 className="size-5" /> 가입 신청이 접수되었습니다
              </p>
              <p className="mt-2 text-[14px]">담당자가 확인한 뒤 승인해 드립니다. 승인되면 신청하신 이메일과 비밀번호로 로그인해서 바로 주문할 수 있습니다.</p>
              <p className="mt-1.5 text-[13px] text-steel">급하시면 아래 전화로 연락 주세요.</p>
            </div>
            <ContactCall phone={settings?.phone} variant="card" />
            <Button asChild variant="outline" className="h-11 w-full text-base">
              <Link href="/login">로그인 화면으로</Link>
            </Button>
          </div>
        ) : (
          <>
            <SignupForm />
            <p className="mt-6 text-center text-[13px] text-steel">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
                로그인
              </Link>
            </p>
            <ContactCall phone={settings?.phone} className="mt-2 justify-center text-sm" />
          </>
        )}
      </div>
    </main>
  );
}
