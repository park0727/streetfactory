/** KPI 타일. 값은 비례 숫자(큰 숫자에 tabular 금지), 경고 톤은 좌측 스트라이프로. */
export function Kpi({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: "warn" | "critical" }) {
  return (
    <div className={`relative overflow-hidden rounded-md border bg-card px-4 py-3.5 ${tone ? "pl-5" : ""}`}>
      {tone && <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${tone === "warn" ? "bg-status-warn" : "bg-status-critical"}`} />}
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-steel">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight">
        {value}
        {unit && <span className="ml-1 text-[13px] font-normal text-steel">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 text-[12px] text-steel">{sub}</p>}
    </div>
  );
}
