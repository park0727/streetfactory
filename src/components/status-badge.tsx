import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PART_STATUS, STOCK_STATUS, type PartStatus, type StockStatus } from "@/lib/parts-shared";

const partStyles: Record<PartStatus, string> = {
  active: "border-slate-300 bg-slate-50 text-slate-700",
  paused: "border-amber-300 bg-amber-50 text-amber-700",
  discontinued: "border-gray-300 bg-gray-100 text-gray-500",
};
const stockStyles: Record<StockStatus, string> = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-700",
  low: "border-amber-300 bg-amber-50 text-amber-700",
  out: "border-red-300 bg-red-50 text-red-700",
};

export function PartStatusBadge({ status }: { status: PartStatus }) {
  return (
    <Badge variant="outline" className={cn(partStyles[status])}>
      {PART_STATUS[status]}
    </Badge>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge variant="outline" className={cn(stockStyles[status])}>
      {STOCK_STATUS[status]}
    </Badge>
  );
}
