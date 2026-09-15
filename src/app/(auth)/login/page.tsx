import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const reason = typeof sp.reason === "string" ? sp.reason : undefined;
  return (
    <main className="flex min-h-svh items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-8 shadow-lg">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground">STREETFACTORY</p>
          <h1 className="text-xl font-bold">부품 관리 시스템</h1>
        </div>
        {reason === "inactive" && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            비활성화된 계정입니다. 관리자에게 문의하세요.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
