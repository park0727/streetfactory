import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import { db } from "@/db";
import { parts, salesOrders, webOrderLines, webOrders } from "@/db/schema";
import { getShopSettings, requireCustomer } from "@/lib/shop";
import { krw, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { OrderStatusChip } from "../../../order-status";
import { CancelOrderButton } from "./cancel-button";
import { CopyButton } from "./copy-button";
import { ContactCall } from "../../../contact-call";

export const metadata = { title: "주문 상세" };

export default async function MyOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireCustomer();
  const { id } = await params;
  const done = (await searchParams).done === "1";
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const [o] = await db
    .select({ id: webOrders.id, orderNo: webOrders.orderNo, status: webOrders.status, vatApplied: webOrders.vatApplied, memo: webOrders.memo, cancelReason: webOrders.cancelReason, createdAt: webOrders.createdAt, salesOrderId: webOrders.salesOrderId, salesDocNo: salesOrders.docNo })
    .from(webOrders)
    .leftJoin(salesOrders, eq(salesOrders.id, webOrders.salesOrderId))
    .where(and(eq(webOrders.id, orderId), eq(webOrders.partnerId, me.partnerId)));
  if (!o) notFound();
  const [lines, settings] = await Promise.all([
    db
      .select({ lineNo: webOrderLines.lineNo, code: parts.code, name: parts.name, spec: parts.spec, qty: webOrderLines.qty, unitPrice: webOrderLines.unitPrice })
      .from(webOrderLines)
      .innerJoin(parts, eq(parts.id, webOrderLines.partId))
      .where(eq(webOrderLines.orderId, orderId))
      .orderBy(asc(webOrderLines.lineNo)),
    getShopSettings(),
  ]);
  const supply = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const vat = o.vatApplied ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;

  return (
    <div className="space-y-4">
      {!done && (
        <Link href="/orders" className="inline-flex items-center gap-1 text-[13px] text-steel">
          <ArrowLeft className="size-4" /> 주문 내역
        </Link>
      )}
      {done && (
        <div className="rounded-md border border-status-ok/30 bg-status-ok/5 p-4">
          <p className="flex items-center gap-2 text-[16px] font-semibold text-status-ok">
            <CheckCircle2 className="size-5" /> 주문이 접수되었습니다
          </p>
          {settings?.orderNotice && <p className="mt-1.5 text-[13.5px] whitespace-pre-line">{settings.orderNotice}</p>}
        </div>
      )}
      {o.status === "pending" && (
        <section className="overflow-hidden rounded-md border-2 border-primary/80 bg-card">
          <p className="bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground">{settings?.bankAccount ? "아래 계좌로 입금해 주세요" : "입금 안내"}</p>
          <div className="space-y-3 p-4">
            <Row label="입금하실 금액">
              <span className="tabular text-[24px] font-semibold leading-tight">{krw(total)}</span>
              <CopyButton text={String(total)} label="입금 금액 복사" done="금액을 복사했습니다." />
            </Row>
            <p className="-mt-2 text-[12px] text-steel">{o.vatApplied ? "부가세 포함 금액" : "부가세 별도 청구 없음"}</p>
            {settings?.bankAccount ? (
              <>
                {settings.bankName && (
                  <Row label="은행">
                    <span className="text-[16px] font-semibold">{settings.bankName}</span>
                  </Row>
                )}
                <Row label="계좌번호" nowrap>
                  <span className="tabular min-w-0 text-[17px] font-semibold break-all">{settings.bankAccount}</span>
                  <CopyButton text={settings.bankAccount} label="계좌번호 복사" done="계좌번호를 복사했습니다. 은행 앱에 붙여넣어 주세요." />
                </Row>
                {settings.bankHolder && (
                  <Row label="예금주">
                    <span className="text-[16px] font-semibold">{settings.bankHolder}</span>
                  </Row>
                )}
                <Row label="입금자명">
                  <span className="text-[15px] font-medium">{me.partnerName}</span>
                </Row>
                <p className="rounded-md bg-muted px-3 py-2 text-[12.5px] text-steel">입금자명을 거래처 이름({me.partnerName})으로 해 주시면 확인이 빠릅니다.</p>
              </>
            ) : (
              <p className="rounded-md bg-muted px-3 py-2 text-[13px]">입금 계좌는 전화로 안내해 드립니다. 아래 전화 버튼을 눌러 주세요.</p>
            )}
          </div>
        </section>
      )}
      {(done || (o.status === "pending" && !settings?.bankAccount)) && <ContactCall phone={settings?.phone} variant="card" />}

      <section className="rounded-md border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <span className="code text-[13px]">{o.orderNo}</span>
          <OrderStatusChip s={o.status} />
          <span className="ml-auto text-[12px] text-steel">{o.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" })}</span>
        </header>
        <ul className="divide-y">
          {lines.map((l) => (
            <li key={l.lineNo} className="flex items-start gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="code text-[11.5px] text-steel">{l.code}</p>
                <p className="text-[14px] leading-snug">{l.name}</p>
                {l.spec && <p className="text-[12px] text-steel">{l.spec}</p>}
              </div>
              <p className="tabular shrink-0 text-right">
                <span className="block text-[11.5px] text-steel">{krw(l.unitPrice)} × {num(l.qty)}</span>
                <span className="font-medium">{krw(l.unitPrice * l.qty)}</span>
              </p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t px-4 py-3 text-[13.5px]">
          <div className="flex justify-between"><dt className="text-steel">공급가</dt><dd className="tabular">{krw(supply)}</dd></div>
          <div className="flex justify-between"><dt className="text-steel">부가세</dt><dd className="tabular">{krw(vat)}</dd></div>
          <div className="flex justify-between text-[15px] font-semibold"><dt>합계</dt><dd className="tabular">{krw(total)}</dd></div>
        </dl>
        {o.memo && <p className="border-t px-4 py-2.5 text-[13px]"><span className="text-steel">요청 사항</span> {o.memo}</p>}
        {o.status === "cancelled" && o.cancelReason && <p className="border-t px-4 py-2.5 text-[13px] text-status-critical">취소 사유: {o.cancelReason}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        {o.status === "pending" && <CancelOrderButton id={o.id} orderNo={o.orderNo} />}
        {o.status === "shipped" && o.salesOrderId && (
          <Button variant="outline" asChild>
            <a href={`/statement?ids=${o.salesOrderId}`} target="_blank" rel="noopener">
              <FileText /> 거래명세서 ({o.salesDocNo})
            </a>
          </Button>
        )}
        {done && (
          <Button asChild variant="outline" className="ml-auto">
            <Link href="/">계속 둘러보기</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, children, nowrap }: { label: string; children: React.ReactNode; nowrap?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[76px] shrink-0 text-[13px] text-steel">{label}</span>
      <div className={`flex min-w-0 flex-1 items-center justify-between gap-2 ${nowrap ? "" : "flex-wrap"}`}>{children}</div>
    </div>
  );
}
