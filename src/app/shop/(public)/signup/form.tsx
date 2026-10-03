"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitSignup, type SignupState } from "../../signup-actions";

function F({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[14px]">
        {label} {required ? <span className="text-status-critical">*</span> : <span className="text-[12px] font-normal text-steel">(선택)</span>}
      </Label>
      {children}
      {hint && <p className="text-[12px] text-steel">{hint}</p>}
    </div>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(submitSignup, undefined);
  const v = state?.values ?? {};
  const [agree, setAgree] = useState(false);
  const cls = "h-11 bg-card text-base";
  return (
    // 오류로 다시 그릴 때 입력값을 살리도록 key 로 새로 만든다
    <form key={JSON.stringify(v)} action={action} className="space-y-5">
      <section className="space-y-4 rounded-md border bg-card p-4">
        <p className="text-[15px] font-semibold">가게 정보</p>
        <F id="su-company" label="가게(상호) 이름" required>
          <Input id="su-company" name="companyName" defaultValue={v.companyName} required maxLength={100} className={cls} placeholder="예: 라이더스 모토" />
        </F>
        <F id="su-contact" label="담당자 이름" required>
          <Input id="su-contact" name="contactName" defaultValue={v.contactName} required maxLength={50} className={cls} autoComplete="name" />
        </F>
        <F id="su-phone" label="연락처" required hint="승인 안내를 이 번호로 드립니다.">
          <Input id="su-phone" name="phone" defaultValue={v.phone} required inputMode="tel" autoComplete="tel" className={cls} placeholder="010-1234-5678" />
        </F>
        <F id="su-biz" label="사업자등록번호" hint="세금계산서가 필요하면 입력해 주세요.">
          <Input id="su-biz" name="bizNo" defaultValue={v.bizNo} inputMode="numeric" className={cls} placeholder="123-45-67890" />
        </F>
        <F id="su-addr" label="가게 주소">
          <Input id="su-addr" name="address" defaultValue={v.address} maxLength={200} className={cls} autoComplete="street-address" />
        </F>
        <F id="su-memo" label="하고 싶은 말">
          <Textarea id="su-memo" name="memo" defaultValue={v.memo} maxLength={500} rows={2} className="bg-card text-base" placeholder="예: 주로 PCX·NMAX 타이어를 찾습니다" />
        </F>
      </section>

      <section className="space-y-4 rounded-md border bg-card p-4">
        <div>
          <p className="text-[15px] font-semibold">로그인 정보</p>
          <p className="mt-0.5 text-[12.5px] text-steel">승인되면 이 이메일과 비밀번호로 주문 화면에 로그인합니다.</p>
        </div>
        <F id="su-email" label="이메일" required>
          <Input id="su-email" name="email" type="email" defaultValue={v.email} required autoComplete="username" className={cls} placeholder="shop@naver.com" />
        </F>
        <F id="su-pw" label="비밀번호" required hint="8자 이상">
          <Input id="su-pw" name="password" type="password" required minLength={8} autoComplete="new-password" className={cls} />
        </F>
        <F id="su-pw2" label="비밀번호 확인" required>
          <Input id="su-pw2" name="password2" type="password" required minLength={8} autoComplete="new-password" className={cls} />
        </F>
      </section>

      {/* 로봇 함정: 사람에게는 보이지 않는 칸 */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          웹사이트 <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <section className="rounded-md border bg-card p-4">
        <p className="text-[13.5px] font-semibold">개인정보 수집·이용 안내</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12.5px] text-steel">
          <li>모으는 항목: 상호, 담당자 이름, 연락처, 이메일, 사업자등록번호·주소(입력한 경우)</li>
          <li>쓰는 곳: 거래처 확인과 승인 안내, 주문·출고·세금계산서 처리</li>
          <li>보관 기간: 거래가 끝날 때까지. 승인되지 않으면 신청 내용만 남기고 로그인 계정은 지웁니다.</li>
        </ul>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
          <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          위 내용에 동의합니다 <span className="text-status-critical">*</span>
        </label>
        <input type="hidden" name="agree" value={agree ? "true" : ""} />
      </section>

      {state?.error && (
        <p role="alert" className="rounded-md border border-status-critical/30 bg-status-critical/5 p-3 text-[14px] text-status-critical">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending || !agree}>
        {pending ? "신청하는 중…" : "가입 신청하기"}
      </Button>
    </form>
  );
}
