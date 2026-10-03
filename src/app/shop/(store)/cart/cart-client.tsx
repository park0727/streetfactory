"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { krw } from "@/lib/format";
import { shown } from "@/lib/pricing";
import { AvailabilityChip } from "../../availability-chip";
import { useCart } from "../../cart-context";
import { placeOrder, quoteCart, type QuoteLine } from "../../actions";

export function CartClient({ vatApplied }: { vatApplied: boolean }) {
  const router = useRouter();
  const { items, setQty, remove, clear, ready } = useCart();
  const [quote, setQuote] = useState<Map<number, QuoteLine>>(new Map());
  const [memo, setMemo] = useState("");
  const [checking, startCheck] = useTransition();
  const [placing, startPlace] = useTransition();

  const sig = items.map((i) => `${i.partId}:${i.qty}`).join(",");
  useEffect(() => {
    if (!ready || items.length === 0) return;
    const t = setTimeout(() => {
      startCheck(async () => {
        const q = await quoteCart(items.map((i) => ({ partId: i.partId, qty: i.qty })));
        setQuote(new Map(q.map((x) => [x.partId, x])));
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);

  // 견적의 price 는 공급가. 화면에는 부가세 포함가로 보여준다
  const lines = items.map((i) => {
    const q = quote.get(i.partId);
    return { ...i, supplyPrice: q?.price, price: q ? shown(q.price, vatApplied) : i.price, listShown: q ? shown(q.list, vatApplied) : null, q };
  });
  const supply = lines.reduce((a, l) => a + l.qty * (l.supplyPrice ?? l.price), 0);
  const vat = vatApplied ? Math.round(supply * 0.1) : 0;
  const problems = lines.filter((l) => l.q && !l.q.ok);
  // 합계 기준 할인 안내는 규칙마다 한 번만
  const totalHints = [...new Map(lines.flatMap((l) => (l.q?.nextTier?.basis === "total" ? [[l.q.nextTier.ruleName, l.q.nextTier] as const] : []))).values()];
  const missing = quote.size > 0 ? lines.filter((l) => !l.q) : [];
  const canOrder = items.length > 0 && quote.size > 0 && problems.length === 0 && missing.length === 0 && !checking;
  const totalQty = useMemo(() => items.reduce((a, i) => a + i.qty, 0), [items]);

  function submit() {
    startPlace(async () => {
      const r = await placeOrder({ memo: memo || undefined, lines: items.map((i) => ({ partId: i.partId, qty: i.qty })) });
      if (!r.ok) {
        toast.error(r.error);
        const q = await quoteCart(items.map((i) => ({ partId: i.partId, qty: i.qty })));
        setQuote(new Map(q.map((x) => [x.partId, x])));
        return;
      }
      clear();
      router.push(`/shop/orders/${r.data.id}?done=1`);
    });
  }

  if (!ready) return <div className="h-40 animate-pulse rounded-md bg-muted" />;
  if (items.length === 0)
    return (
      <div className="rounded-md border bg-card px-6 py-16 text-center">
        <p className="text-base font-medium">장바구니가 비어 있습니다</p>
        <p className="mt-1 text-[13px] text-steel">상품 화면에서 필요한 부품을 담아 주세요.</p>
        <Button asChild className="mt-5">
          <Link href="/shop">상품 보러 가기</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-semibold">장바구니</h1>
      {totalHints.map((t) => (
        <p key={t.ruleName} className="rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2 text-[13.5px] font-medium text-status-critical">
          {t.ruleName} 상품을 {t.remaining}개 더 담으면 모두 {t.rate}% 할인됩니다
        </p>
      ))}
      <ul className="divide-y overflow-hidden rounded-md border bg-card">
        {lines.map((l) => {
          const bad = l.q && !l.q.ok;
          return (
            <li key={l.partId} className={`px-4 py-3 ${bad ? "bg-status-critical/[0.04]" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="code text-[11.5px] text-steel">{l.code}</p>
                  <p className="text-[15px] leading-snug font-medium">{l.name}</p>
                  {l.spec && <p className="text-[12.5px] text-steel">{l.spec}</p>}
                </div>
                <button type="button" onClick={() => remove(l.partId)} className="rounded p-1 text-steel hover:text-status-critical" aria-label={`${l.code} ${l.name} 삭제`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-9 items-center rounded-md border bg-card">
                  <button type="button" className="flex size-9 items-center justify-center text-steel disabled:opacity-40" onClick={() => setQty(l.partId, l.qty - 1)} disabled={l.qty <= 1} aria-label="수량 줄이기">
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={l.qty}
                    onChange={(e) => setQty(l.partId, Math.min(9999, Number(e.target.value) || 1))}
                    className="tabular h-9 w-12 border-x bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={`${l.code} ${l.name} 수량`}
                  />
                  <button type="button" className="flex size-9 items-center justify-center text-steel" onClick={() => setQty(l.partId, l.qty + 1)} aria-label="수량 늘리기">
                    <Plus className="size-4" />
                  </button>
                </div>
                {l.q && <AvailabilityChip a={l.q.availability} />}
                <p className="tabular ml-auto text-right">
                  <span className="block text-[11.5px] text-steel">{krw(l.price)} × {l.qty}</span>
                  <span className="font-semibold">{krw(l.price * l.qty)}</span>
                </p>
              </div>
              {l.q && l.q.rate > 0 && l.listShown && l.listShown > l.price && (
                <p className="mt-1 text-[12px] text-status-critical">
                  <span className="text-steel line-through">{krw(l.listShown)}</span> → {krw(l.price)} ({Math.round((1 - l.price / l.listShown) * 100)}% 할인 적용)
                </p>
              )}
              {l.q?.nextTier && l.q.ok && l.q.nextTier.basis === "line" && (
                <p className="mt-0.5 text-[12px] text-primary">
                  이 상품을 {l.q.nextTier.remaining}개 더 담으면 {l.q.nextTier.rate}% 할인
                </p>
              )}
              {bad && <p className="mt-1.5 text-[12.5px] text-status-critical">{l.q!.orderable ? "주문 가능 수량을 초과했습니다. 수량을 줄여 주세요." : "지금 주문할 수 없는 상품입니다. 삭제해 주세요."}</p>}
            </li>
          );
        })}
      </ul>

      <div className="space-y-1.5">
        <label htmlFor="cart-memo" className="text-sm font-medium">요청 사항</label>
        <Textarea id="cart-memo" value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} maxLength={300} placeholder="배송·포장 요청, 입금자명 등 (선택)" />
      </div>

      <div className="rounded-md border bg-card p-4">
        <dl className="space-y-1.5 text-[14px]">
          <div className="flex justify-between"><dt className="text-steel">상품 {items.length}종 · {totalQty}개</dt><dd className="tabular">{krw(supply + vat)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-[16px] font-semibold"><dt>결제 예정 금액</dt><dd className="tabular">{krw(supply + vat)}</dd></div>
        </dl>
        <p className="mt-2 text-[12px] text-steel">주문 후 안내되는 계좌로 입금해 주세요. 담당자가 확인 후 출고합니다.</p>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-4">
        <Button className="h-12 w-full text-base shadow-lg" disabled={!canOrder || placing} onClick={submit}>
          {placing ? "주문 접수 중…" : checking ? "재고 확인 중…" : problems.length ? "수량을 조정해 주세요" : `${krw(supply + vat)} 주문하기`}
        </Button>
      </div>
    </div>
  );
}
