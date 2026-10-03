"use client";
import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { krw } from "@/lib/format";
import { tierHint, type Availability, type NextTier } from "@/lib/pricing";
import { AvailabilityChip } from "../availability-chip";
import { useCart } from "../cart-context";
import { BrandMark } from "../brand-mark";

type P = {
  partId: number;
  code: string;
  name: string;
  spec: string | null;
  manufacturer: string | null;
  tireSize: string | null;
  brandName: string | null;
  brandLogo: string | null;
  price: number; // 표시 판매가
  list: number; // 표시 정가
  off: number; // 할인 %
  nextTier: NextTier | null;
  availability: Availability;
  paused: boolean;
};

export function ProductRow({ p }: { p: P }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(0);
  const inCart = items.find((i) => i.partId === p.partId)?.qty ?? 0;
  const disabled = p.availability === "out";
  return (
    <li className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 py-3 ${disabled ? "bg-muted/30" : ""}`}>
      <div className="min-w-0">
        {p.tireSize ? (
          <>
            <p className="tabular text-[18px] leading-tight font-semibold tracking-tight">{p.tireSize}</p>
            <BrandMark name={p.brandName} logo={p.brandLogo} className="mt-1" />
            <p className="mt-1 text-[13.5px] leading-snug">{p.name}</p>
            {p.spec && <p className="text-[12px] text-steel">{p.spec}</p>}
            <p className="code mt-0.5 text-[11px] text-steel">{p.code}</p>
          </>
        ) : (
          <>
            <p className="code text-[11.5px] text-steel">
              {p.code}
              {!p.brandName && p.manufacturer && ` · ${p.manufacturer}`}
            </p>
            <p className="text-[15px] leading-snug font-medium">{p.name}</p>
            {p.brandName && <BrandMark name={p.brandName} logo={p.brandLogo} className="mt-1" />}
            {p.spec && <p className="mt-0.5 text-[12.5px] text-steel">{p.spec}</p>}
          </>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        {p.off > 0 && (
          <p className="flex items-center gap-1.5">
            <span className="tabular text-[12px] text-steel line-through">{krw(p.list)}</span>
            <span className="rounded bg-status-critical px-1 text-[11px] font-bold text-white">{p.off}%</span>
          </p>
        )}
        <p className={`tabular text-[16px] font-semibold ${p.off > 0 ? "text-status-critical" : ""}`}>{krw(p.price)}</p>
        <AvailabilityChip a={p.availability} paused={p.paused} />
      </div>
      {p.nextTier && !disabled && (
        <p className="col-span-2 -mt-1 text-[12px] font-medium text-status-critical">{tierHint(p.nextTier)}</p>
      )}
      <div className="col-span-2 flex items-center justify-end gap-2">
        {inCart > 0 && <span className="mr-auto text-[12px] text-primary">장바구니에 {inCart}개</span>}
        <div className="flex h-9 items-center rounded-md border bg-card">
          <button type="button" className="flex size-9 items-center justify-center text-steel disabled:opacity-40" onClick={() => setQty((q) => Math.max(0, q - 1))} disabled={disabled || qty <= 0} aria-label="수량 줄이기">
            <Minus className="size-4" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={qty}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQty(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
            disabled={disabled}
            className="tabular h-9 w-11 border-x bg-transparent text-center text-[14px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            aria-label={`${p.code} ${p.name} 수량`}
          />
          <button type="button" className="flex size-9 items-center justify-center text-steel disabled:opacity-40" onClick={() => setQty((q) => q + 1)} disabled={disabled} aria-label="수량 늘리기">
            <Plus className="size-4" />
          </button>
        </div>
        <Button
          className="h-9"
          disabled={disabled || qty === 0}
          title={qty === 0 ? "수량을 먼저 정해 주세요" : undefined}
          onClick={() => {
            add({ partId: p.partId, code: p.code, name: p.tireSize ? `${p.tireSize} ${p.name}` : p.name, spec: p.spec, price: p.price }, qty);
            toast.success(`${p.tireSize ?? p.name} ${qty}개를 담았습니다.`, { duration: 1500 });
            setQty(0);
          }}
        >
          <ShoppingCart /> 담기
        </Button>
      </div>
    </li>
  );
}
