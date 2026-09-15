"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, MOBILE_TABS } from "./nav";
import { Brand } from "@/components/brand";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";

type Props = { user: { name: string; role: "admin" | "staff" } };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavList({ user, onNavigate }: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">{g.title}</p>
          <ul className="space-y-px">
            {g.items
              .filter((i) => !i.adminOnly || user.role === "admin")
              .map((i) => {
                const active = isActive(pathname, i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-9 items-center gap-2.5 rounded-md px-3 text-[13.5px] text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:outline-2 focus-visible:outline-signal",
                        active && "bg-sidebar-accent font-medium text-white",
                      )}
                    >
                      {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-sm bg-signal" />}
                      <i.icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBox({ user, onNavigate }: Props & { onNavigate?: () => void }) {
  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border px-3 py-3">
      <Link
        href="/settings/profile"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-signal"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground">
          <UserRound className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-white">{user.name}</span>
          <span className="block text-[11px] text-sidebar-foreground/55">{user.role === "admin" ? "관리자" : "직원"} · 내 정보</span>
        </span>
      </Link>
      <form action={logoutAction}>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white"
          title="로그아웃"
          aria-label="로그아웃"
        >
          <LogOut strokeWidth={1.75} />
        </Button>
      </form>
    </div>
  );
}

export function Sidebar({ user }: Props) {
  return (
    <aside className="sticky top-0 hidden h-svh w-[232px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-6 pt-6 pb-1">
        <Brand className="text-white" />
      </div>
      <NavList user={user} />
      <UserBox user={user} />
    </aside>
  );
}

export function MobileHeader({ user }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // 경로가 바뀌면(링크 이동, 뒤로가기 포함) 드로어를 닫는다
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header
      className="sticky z-30 flex h-12 items-center gap-1 bg-sidebar px-2 text-sidebar-foreground md:hidden"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-sidebar-accent" aria-label="메뉴 열기">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[280px] flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="px-6 pt-6 pb-1">
            <Brand className="text-white" />
          </SheetTitle>
          <NavList user={user} onNavigate={() => setOpen(false)} />
          <UserBox user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Brand size="sm" className="text-white" />
    </header>
  );
}

export function MobileTabs() {
  const pathname = usePathname();
  const items = NAV.flatMap((g) => g.items).filter((i) => MOBILE_TABS.includes(i.href));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {items.map((i) => {
        const active = isActive(pathname, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-steel",
              active && "text-primary font-medium",
            )}
          >
            {active && <span aria-hidden className="absolute inset-x-5 top-0 h-[2px] rounded-b bg-signal" />}
            <i.icon className="size-5" strokeWidth={1.75} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
