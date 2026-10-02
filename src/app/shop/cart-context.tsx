"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { partId: number; code: string; name: string; spec: string | null; price: number; qty: number };
type Ctx = {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "qty">, qty: number) => void;
  setQty: (partId: number, qty: number) => void;
  remove: (partId: number) => void;
  clear: () => void;
  ready: boolean;
};
const CartCtx = createContext<Ctx | null>(null);

/** 장바구니는 기기(localStorage)에 고객별로 저장한다. 가격·재고는 주문 직전에 서버가 다시 확인한다. */
export function CartProvider({ customerId, children }: { customerId: string; children: ReactNode }) {
  const key = `sf-cart-${customerId}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let saved: CartItem[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소(localStorage)에서 한 번 복원
    setItems(Array.isArray(saved) ? saved : []);
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
  }, [items, key, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty: number) => {
    setItems((cur) => {
      const found = cur.find((c) => c.partId === item.partId);
      if (found) return cur.map((c) => (c.partId === item.partId ? { ...c, ...item, qty: c.qty + qty } : c));
      return [...cur, { ...item, qty }];
    });
  }, []);
  const setQty = useCallback((partId: number, qty: number) => setItems((cur) => cur.map((c) => (c.partId === partId ? { ...c, qty: Math.max(1, qty) } : c))), []);
  const remove = useCallback((partId: number) => setItems((cur) => cur.filter((c) => c.partId !== partId)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, count: items.length, add, setQty, remove, clear, ready }), [items, add, setQty, remove, clear, ready]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("CartProvider 밖에서 useCart 를 호출했습니다.");
  return c;
}
