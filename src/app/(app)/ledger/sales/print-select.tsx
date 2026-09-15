"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const Ctx = createContext<{ sel: Set<number>; toggle: (id: number) => void; setAll: (ids: number[], on: boolean) => void } | null>(null);

/** 목록에서 전표를 골라 한 번에 인쇄하기 위한 선택 상태 */
export function PrintSelection({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setAll = (ids: number[], on: boolean) => setSel((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  return <Ctx.Provider value={{ sel, toggle, setAll }}>{children}</Ctx.Provider>;
}

export function RowCheck({ id }: { id: number }) {
  const c = useContext(Ctx)!;
  return <input type="checkbox" className="accent-primary" checked={c.sel.has(id)} onChange={() => c.toggle(id)} aria-label="인쇄 선택" />;
}

export function HeadCheck({ ids }: { ids: number[] }) {
  const c = useContext(Ctx)!;
  const all = ids.length > 0 && ids.every((id) => c.sel.has(id));
  return <input type="checkbox" className="accent-primary" checked={all} onChange={(e) => c.setAll(ids, e.target.checked)} aria-label="전체 선택" />;
}

export function PrintSelectedButton() {
  const c = useContext(Ctx)!;
  const n = c.sel.size;
  return (
    <Button variant="outline" size="sm" disabled={n === 0} onClick={() => window.open(`/print/sales?ids=${[...c.sel].join(",")}`, "_blank")}>
      <Printer /> 선택 인쇄{n > 0 && ` (${n})`}
    </Button>
  );
}
