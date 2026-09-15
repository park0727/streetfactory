import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Sidebar, MobileHeader, MobileTabs } from "@/components/app-shell/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireUser();
  if (profile.mustChangePassword) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (!pathname.startsWith("/settings/profile")) redirect("/settings/profile");
  }
  const user = { name: profile.name, role: profile.role };
  return (
    <div className="flex min-h-svh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} />
        <main className="flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-7 md:pb-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
        <MobileTabs />
      </div>
    </div>
  );
}
