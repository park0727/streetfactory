"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, PackageSearch, ShoppingCart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-context";

const TABS = [
  { href: "/shop", label: "상품", icon: PackageSearch },
  { href: "/shop/cart", label: "장바구니", icon: ShoppingCart },
  { href: "/shop/orders", label: "주문 내역", icon: ClipboardList },
  { href: "/shop/account", label: "내 정보", icon: UserRound },
];
const active = (p: string, href: string) => (href === "/shop" ? p === "/shop" : p.startsWith(href));

export function ShopTopNav() {
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn("relative flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white", active(pathname, t.href) && "bg-sidebar-accent font-medium text-white")}
        >
          <t.icon className="size-4" strokeWidth={1.75} />
          {t.label}
          {t.href === "/shop/cart" && count > 0 && <span className="ml-0.5 rounded-full bg-signal px-1.5 text-[11px] font-semibold text-white">{count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function ShopBottomTabs() {
  const pathname = usePathname();
  const { count } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {TABS.map((t) => {
        const on = active(pathname, t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-steel", on && "font-medium text-primary")}>
            {on && <span aria-hidden className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-signal" />}
            <span className="relative">
              <t.icon className="size-5" strokeWidth={1.75} />
              {t.href === "/shop/cart" && count > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-signal px-1 text-center text-[10px] font-semibold leading-4 text-white">{count}</span>}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
