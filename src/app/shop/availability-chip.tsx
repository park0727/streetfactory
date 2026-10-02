import { cn } from "@/lib/utils";
import { AVAILABILITY_LABEL, type Availability } from "@/lib/pricing";

export function AvailabilityChip({ a, paused }: { a: Availability; paused?: boolean }) {
  const cls = a === "ok" ? "border-status-ok/40 bg-status-ok/5 text-status-ok" : a === "low" ? "border-status-warn/40 bg-status-warn/5 text-status-warn" : "border-status-critical/40 bg-status-critical/5 text-status-critical";
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11.5px] font-medium whitespace-nowrap", cls)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {paused ? "일시품절" : AVAILABILITY_LABEL[a]}
    </span>
  );
}
