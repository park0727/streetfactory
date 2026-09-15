"use client";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { krw } from "@/lib/format";

/* dataviz 규칙: 한 축(둘 다 ₩), 얇은 막대(≤24px, 끝만 둥글게), 2px 선 + 8px 마커, 헤어라인 실선 그리드,
   범례는 2계열 이상일 때, 텍스트는 데이터색을 입지 않는다. */

const compact = (v: number) => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : Math.abs(v) >= 1e4 ? `${Math.round(v / 1e4).toLocaleString()}만` : v.toLocaleString());

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-[12.5px] shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-steel">{p.name}</span>
          <span className="tabular ml-auto font-medium">{krw(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function MonthlyChart({ data }: { data: { month: string; amount: number; profit: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--steel)", fontSize: 11.5 }} tickFormatter={(m: string) => `${Number(m.slice(5))}월`} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--steel)", fontSize: 11.5 }} tickFormatter={compact} width={52} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--steel)" }} />
        <Bar dataKey="amount" name="매출액" fill="var(--chart-1)" maxBarSize={24} radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="profit" name="매출이익" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 4, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** 카테고리별 재고 평가액: 값이 몇 개 안 되는 단일 계열이라 CSS 막대 목록으로 그린다 (라벨·툴팁 없이도 값이 읽힌다). */
export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.name} className="grid grid-cols-[76px_1fr_auto] items-center gap-3 text-[12.5px]">
          <span className="truncate" title={d.name}>{d.name}</span>
          <span className="h-4 overflow-hidden rounded-r-sm bg-muted/70">
            <span className="block h-full rounded-r-sm bg-chart-1" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="tabular w-[120px] text-right">
            {krw(d.value)}
            <span className="ml-1.5 inline-block w-8 text-steel">{total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
