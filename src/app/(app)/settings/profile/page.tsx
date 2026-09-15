import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PasswordForm } from "./password-form";

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
    </>
  );
}
