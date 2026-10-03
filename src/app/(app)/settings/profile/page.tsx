import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PasswordForm } from "./password-form";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { PushSetup } from "./push-setup";
import { InstallApp } from "../../../shop/install-app";

export const metadata = { title: "내 정보" };

export default async function ProfilePage() {
  const me = await requireUser();
  return (
    <>
      <PageHeader title="내 정보" description={`${me.name} · ${me.email} · ${me.role === "admin" ? "관리자" : "직원"}`} />
      {me.mustChangePassword && (
        <Alert className="mb-4 max-w-lg border-amber-300 bg-amber-50 text-amber-900">
          <AlertTitle>비밀번호를 변경해야 합니다</AlertTitle>
          <AlertDescription>임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정해야 다른 화면을 쓸 수 있습니다.</AlertDescription>
        </Alert>
      )}
      <PasswordForm forced={me.mustChangePassword} />
      {!me.mustChangePassword && (
        <section className="mt-8 max-w-xl space-y-3 border-t pt-6">
          <div>
            <h2 className="text-[16px] font-semibold">주문 알림</h2>
            <p className="text-[13px] text-steel">거래처가 온라인으로 주문하면 이 휴대폰(또는 PC)에 바로 알림이 옵니다. 알림을 누르면 그 주문이 열립니다.</p>
          </div>
          <PushSetup
            vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
            devices={(
              await db
                .select({ id: pushSubscriptions.id, device: pushSubscriptions.device, endpoint: pushSubscriptions.endpoint, createdAt: pushSubscriptions.createdAt, lastSuccessAt: pushSubscriptions.lastSuccessAt })
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.profileId, me.id))
                .orderBy(desc(pushSubscriptions.createdAt))
            ).map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), lastSuccessAt: d.lastSuccessAt?.toISOString() ?? null }))}
          />
          <div className="pt-2">
            <p className="mb-1.5 text-[13px] text-steel">관리자 화면도 휴대폰 홈 화면에 앱처럼 추가할 수 있습니다.</p>
            <InstallApp app="admin" />
          </div>
        </section>
      )}
    </>
  );
}
