import { cn } from "@/lib/utils";

export const WEB_ORDER_STATUS = { pending: "접수", shipped: "출고 완료", cancelled: "취소" } as const;
export type WebOrderStatus = keyof typeof WEB_ORDER_STATUS;

export function OrderStatusChip({ s }: { s: WebOrderStatus }) {
  const cls = s === "pending" ? "border-status-warn/40 bg-status-warn/5 text-status-warn" : s === "shipped" ? "border-status-ok/40 bg-status-ok/5 text-status-ok" : "border-border bg-muted text-steel";
  return <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-[11.5px] font-medium whitespace-nowrap", cls)}>{WEB_ORDER_STATUS[s]}</span>;
}
