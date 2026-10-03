import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getShopSettings, requireCustomer } from "@/lib/shop";
import { ContactCall } from "../contact-call";
import { CartProvider } from "../cart-context";
import { ShopBottomTabs, ShopTopNav } from "../shop-nav";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const me = await requireCustomer();
  const settings = await getShopSettings();
  if (me.mustChangePassword) {
    const path = (await headers()).get("x-pathname") ?? "";
    if (!path.startsWith("/shop/account")) redirect("/shop/account?pw=1");
  }
  return (
    <CartProvider customerId={me.id}>
      <div className="flex min-h-svh flex-col bg-background">
        <header className="sticky z-30 bg-sidebar text-sidebar-foreground" style={{ top: "env(safe-area-inset-top, 0px)" }}>
          <div className="mx-auto flex h-13 max-w-5xl items-center gap-3 px-4">
            <Brand size="sm" className="text-white" />
            <span className="hidden truncate text-[12.5px] text-sidebar-foreground/70 sm:inline">{me.partnerName}</span>
            <div className="ml-auto flex items-center gap-2">
              <ShopTopNav />
              <ContactCall phone={settings?.phone} variant="header" />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:pb-10">{children}</main>
        <ShopBottomTabs />
      </div>
    </CartProvider>
  );
}
