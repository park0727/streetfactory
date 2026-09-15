"use client";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SaleForm } from "./sale-form";
import { InboundForm } from "./inbound-form";

type Props = React.ComponentProps<typeof SaleForm> & {
  suppliers: React.ComponentProps<typeof InboundForm>["suppliers"];
};

/** PC(xl 이상): 좌 판매 / 우 입고 2단. 그 외: 탭 전환. 폼 id 중복을 막기 위해 한 레이아웃만 렌더한다. */
export function EntryClient({
  partners,
  channels,
  isAdmin,
  today,
  suppliers,
}: Props) {
  const wide = useMediaQuery("(min-width: 1280px)");
  const sale = (
    <SaleForm
      partners={partners}
      channels={channels}
      isAdmin={isAdmin}
      today={today}
    />
  );
  const inbound = <InboundForm suppliers={suppliers} today={today} />;
  if (wide) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <Section
          icon={<ArrowUpFromLine className="size-4" />}
          title="국내 거래처 주문 / 출고"
          hint="판매 전표 SLS-YYYY-NNNNN"
        >
          {sale}
        </Section>
        <Section
          icon={<ArrowDownToLine className="size-4" />}
          title="해외 부품 수입 / 입고"
          hint="입고 전표 INB-YYYY-NNNNN"
        >
          {inbound}
        </Section>
      </div>
    );
  }
  return (
    <Tabs defaultValue="sale">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="sale" className="flex-1 sm:flex-none">
          <ArrowUpFromLine className="size-4" /> 출고 등록
        </TabsTrigger>
        <TabsTrigger value="inbound" className="flex-1 sm:flex-none">
          <ArrowDownToLine className="size-4" /> 입고 등록
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sale" className="pt-3">
        <Section
          icon={<ArrowUpFromLine className="size-4" />}
          title="국내 거래처 주문 / 출고"
        >
          {sale}
        </Section>
      </TabsContent>
      <TabsContent value="inbound" className="pt-3">
        <Section
          icon={<ArrowDownToLine className="size-4" />}
          title="해외 부품 수입 / 입고"
        >
          {inbound}
        </Section>
      </TabsContent>
    </Tabs>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="text-primary">{icon}</span>
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        {hint && (
          <span className="ml-auto hidden text-[11.5px] text-steel sm:inline">
            {hint}
          </span>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
