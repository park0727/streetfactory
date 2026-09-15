"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StockStatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { krw, num } from "@/lib/format";
import { searchParts, type PartHit } from "./actions";

type Props = { value: PartHit | null; onChange: (p: PartHit) => void; id?: string; autoFocus?: boolean; showPrice?: "retail" | "cost" };

/**
 * 부품 검색 셀렉터. 코드·부품명·호환기종을 서버에서 검색하고 현재재고를 함께 보여준다.
 * 코드가 정확히 일치하면 Enter 로 즉시 선택된다 (나중에 바코드 스캐너 입력과 호환).
 */
export function PartPicker({ value, onChange, id, autoFocus, showPrice = "retail" }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PartHit[]>([]);
  const [pending, start] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const my = ++seq.current;
    const t = setTimeout(() => {
      start(async () => {
        const r = await searchParts(q);
        if (my === seq.current) setHits(r);
      });
    }, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [q, open]);

  function pick(p: PartHit) {
    onChange(p);
    setOpen(false);
    setQ("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} autoFocus={autoFocus} className={cn("h-9 w-full min-w-0 justify-between overflow-hidden bg-card px-2.5 font-normal", !value && "text-steel")}>
          {value ? (
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <span className="code shrink-0">{value.code}</span>
              <span className="min-w-0 truncate">{value.name}</span>
              {value.spec && <span className="hidden min-w-0 truncate text-[12px] text-steel lg:inline">{value.spec}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="size-4" /> 코드 · 부품명 · 호환기종
            </span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="검색어 입력 (코드 정확 일치 시 Enter 로 바로 선택)"
            value={q}
            onValueChange={setQ}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const exact = hits.find((h) => h.code.toUpperCase() === q.trim().toUpperCase());
                if (exact) {
                  e.preventDefault();
                  pick(exact);
                }
              }
            }}
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{pending ? "검색 중…" : "일치하는 부품이 없습니다."}</CommandEmpty>
            <CommandGroup>
              {hits.map((h) => (
                <CommandItem key={h.id} value={String(h.id)} onSelect={() => pick(h)} className="items-start gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="code text-[12.5px]">{h.code}</span>
                      <span className="truncate font-medium">{h.name}</span>
                      {h.status === "paused" && <span className="text-[11px] text-status-warn">일시품절</span>}
                    </div>
                    {h.spec && <div className="truncate text-[12px] text-steel">{h.spec}</div>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="tabular text-[12.5px]">
                      재고 <b className={h.stockStatus === "out" ? "text-status-critical" : h.stockStatus === "low" ? "text-status-warn" : ""}>{num(h.qty)}</b>
                    </span>
                    <span className="text-[11.5px] text-steel">{showPrice === "retail" ? `소비자가 ${krw(h.retailPrice)}` : `평균원가 ${krw(h.avgCost)}`}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function StockHint({ p, qty, extra = 0 }: { p: PartHit | null; qty: number; extra?: number }) {
  if (!p) return null;
  const avail = p.qty + extra;
  const over = qty > avail;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <StockStatusBadge status={p.stockStatus} />
      <span className={cn("tabular", over ? "font-medium text-status-critical" : "text-steel")}>
        가용 {num(avail)}개{extra > 0 && ` (이 전표분 ${num(extra)} 포함)`}{over && ` · ${num(qty - avail)}개 부족`}
      </span>
    </div>
  );
}
