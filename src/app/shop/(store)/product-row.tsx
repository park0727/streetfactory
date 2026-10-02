"use client";
import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { krw } from "@/lib/format";
import type { Availability } from "@/lib/pricing";
import { AvailabilityChip } from "../availability-chip";
import { useCart } from "../cart-context";

type P = { partId: number; code: string; name: string; spec: string | null; manufacturer: string | null; price: number; availability: Availability; paused: boolean };

export function ProductRow({ p }: { p: P }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const inCart = items.find((i) => i.partId === p.partId)?.qty ?? 0;
  const disabled = p.availability === "out";
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0">
        <p className="code text-[11.5px] text-steel">{p.code}{p.manufacturer && ` · ${p.manufacturer}`}</p>
        <p className="text-[15px] leading-snug font-medium">{p.name}</p>
        {p.spec && <p className="mt-0.5 text-[12.5px] text-steel">{p.spec}</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="tabular text-[15px] font-semibold">{krw(p.price)}</p>
        <AvailabilityChip a={p.availability} paused={p.paused} />
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        {inCart > 0 && <span className="mr-auto text-[12px] text-primary">장바구니에 {inCart}개</span>}
        <div className="flex h-9 items-center rounded-md border bg-card">
          <button type="button" className="flex size-9 items-center justify-center text-steel disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={disabled || qty <= 1} aria-label="수량 줄이기">
            <Minus className="size-4" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))}
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
          disabled={disabled}
          onClick={() => {
            add({ partId: p.partId, code: p.code, name: p.name, spec: p.spec, price: p.price }, qty);
            toast.success(`${p.name} ${qty}개를 담았습니다.`, { duration: 1500 });
            setQty(1);
          }}
        >
          <ShoppingCart /> 담기
        </Button>
      </div>
    </li>
  );
}
