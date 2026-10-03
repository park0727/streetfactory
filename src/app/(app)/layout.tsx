import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { webOrders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Sidebar, MobileHeader, MobileTabs } from "@/components/app-shell/sidebar";
import { NewOrderAlert } from "@/components/app-shell/new-order-alert";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireUser();
  if (profile.mustChangePassword) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (!pathname.startsWith("/settings/profile")) redirect("/settings/profile");
  }
  const user = { name: profile.name, role: profile.role };
  const [{ n: pendingOrders }] = await db.select({ n: sql<number>`count(*)::int` }).from(webOrders).where(eq(webOrders.status, "pending"));
  const badges = { "/orders": pendingOrders };
  return (
    <div className="flex min-h-svh">
      <Sidebar user={user} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} badges={badges} />
        <main className="flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-7 md:pb-10">
          <div className="mx-auto w-full max-w-[1400px]">
            <NewOrderAlert count={pendingOrders} />
            {children}
          </div>
        </main>
        <MobileTabs />
      </div>
    </div>
  );
}
