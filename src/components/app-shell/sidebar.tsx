"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, MOBILE_TABS } from "./nav";
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
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.title}>
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items
              .filter((i) => !i.adminOnly || user.role === "admin")
              .map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive(pathname, i.href) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    )}
                  >
                    <i.icon className="size-4 shrink-0" />
                    {i.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBox({ user }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
        <p className="text-xs text-sidebar-foreground/60">{user.role === "admin" ? "관리자" : "직원"}</p>
      </div>
      <form action={logoutAction}>
        <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" title="로그아웃">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}

export function Sidebar({ user }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-5 pb-2 pt-5">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-sidebar-foreground/60">STREETFACTORY</p>
        <p className="text-base font-bold">부품 관리</p>
      </div>
      <NavList user={user} />
      <UserBox user={user} />
    </aside>
  );
}

export function MobileHeader({ user }: Props) {
  return (
    <header
      className="sticky z-30 flex h-12 items-center gap-2 border-b bg-sidebar px-3 text-sidebar-foreground md:hidden"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="px-5 pt-5 text-base font-bold text-sidebar-foreground">STREETFACTORY</SheetTitle>
          <NavList user={user} />
          <UserBox user={user} />
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold">Streetfactory</span>
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
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
            isActive(pathname, i.href) && "text-primary font-medium",
          )}
        >
          <i.icon className="size-5" />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
