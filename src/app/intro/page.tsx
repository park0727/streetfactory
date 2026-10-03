import type { Metadata } from "next";
import { Building2, ClipboardList, Phone, Wrench } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { bizNo } from "@/lib/format";
import { getShopSettings } from "@/lib/shop";
import { urlFor } from "@/lib/site-url";

/** ridermania.co.kr 첫 화면 (회사 소개). 로그인 없이 보인다. src/proxy.ts 가 "/" 를 여기로 보낸다. */
export const metadata: Metadata = {
  title: { absolute: "라이더매니아 · 오토바이 수리 · 수입 부품" },
  description: "오토바이 수리와 수입 타이어·부품 도매. 거래처는 온라인으로 바로 주문할 수 있습니다.",
  manifest: null,
  robots: { index: true, follow: true },
  appleWebApp: { capable: false },
  icons: { icon: "/shop-icon-192.png", apple: "/shop-icon-180.png" },
};

const FEATURES = [
  { icon: Building2, title: "수입 타이어·부품", desc: "수입 오토바이 타이어와 부품을 재고로 갖추고 공급합니다." },
  { icon: Wrench, title: "오토바이 수리", desc: "타이어 교체와 오토바이 정비·수리를 합니다." },
  { icon: ClipboardList, title: "거래처 온라인 주문", desc: "가입 승인된 거래처는 휴대폰으로 재고를 보고 바로 주문할 수 있습니다." },
];

export default async function IntroPage() {
  const [s, shop, signup] = await Promise.all([getShopSettings(), urlFor("shop"), urlFor("shop", "/signup")]);
  const company = s?.companyName || "라이더매니아";
  const tel = s?.phone?.replace(/[^0-9]/g, "");
  return (
    <main className="flex min-h-svh flex-col bg-background">
      <section className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Brand href="/" size="md" className="text-white" />
          {s?.phone && (
            <a href={`tel:${tel}`} className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-2 text-[14px] text-white hover:bg-white/15">
              <Phone className="size-4" /> {s.phone}
            </a>
          )}
        </div>
        <div className="mx-auto max-w-5xl px-5 pt-10 pb-16 sm:pt-16 sm:pb-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-signal">Motorcycle Parts &amp; Service</p>
          <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.08] tracking-tight text-white text-balance sm:text-[60px]">
            오토바이 수리와
            <br />
            수입 타이어·부품
          </h1>
          <p className="mt-5 max-w-md text-[15.5px] text-sidebar-foreground/75">{company}는 수입 오토바이 타이어와 부품을 공급하고, 매장에서 수리까지 함께 합니다.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 bg-signal px-6 text-[16px] text-white hover:bg-signal/90">
              <a href={shop}>거래처 부품 주문하기</a>
            </Button>
            {s?.phone && (
              <Button asChild size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-6 text-[16px] text-white hover:bg-white/10 hover:text-white">
                <a href={`tel:${tel}`}>
                  <Phone /> 전화 문의
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="hatch h-3 w-full" aria-hidden />
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-5 py-12 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-lg border bg-card p-5">
            <f.icon className="size-6 text-signal" strokeWidth={1.75} />
            <h2 className="mt-3 text-[16px] font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-[14px] text-steel">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-12">
        <div className="flex flex-col items-start gap-4 rounded-lg bg-sidebar px-6 py-6 text-sidebar-foreground sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-[17px] font-semibold text-white">거래처 가입 안내</p>
            <p className="mt-1 text-[14px] text-sidebar-foreground/70">오토바이 가게·정비점이라면 온라인으로 가입 신청하세요. 확인 후 승인되면 바로 주문할 수 있습니다.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild className="h-11 bg-signal px-5 text-white hover:bg-signal/90">
              <a href={signup}>거래처 가입 신청</a>
            </Button>
            {s?.phone && (
              <Button asChild variant="outline" className="h-11 border-white/30 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
                <a href={`tel:${tel}`}>
                  <Phone /> {s.phone}
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 text-[12.5px] text-steel ">
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{company}</p>
            <p>
              {[s?.ceoName && `대표 ${s.ceoName}`, s?.bizNo && `사업자등록번호 ${bizNo(s.bizNo)}`, s?.mailOrderNo && `통신판매업 ${s.mailOrderNo}`].filter(Boolean).join(" · ")}
            </p>
            {s?.address && <p>{s.address}</p>}
            {s?.phone && <p>전화 {s.phone}</p>}
          </div>
        </div>
      </footer>
    </main>
  );
}
