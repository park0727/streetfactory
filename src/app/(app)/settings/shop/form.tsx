"use client";
import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/page-header";
import { useActionToast } from "@/hooks/use-action-toast";
import { bizNo } from "@/lib/format";
import type { ShopSettings } from "@/db/schema";
import { saveShopSettings } from "./actions";

function F({ id, label, hint, children, className = "" }: { id: string; label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-[11.5px] text-steel">{hint}</p>}
    </div>
  );
}

export function ShopSettingsForm({ s }: { s: ShopSettings | null }) {
  const [state, action, pending] = useActionState(saveShopSettings, undefined);
  useActionToast(state);
  const [bank, setBank] = useState({ name: s?.bankName ?? "", account: s?.bankAccount ?? "", holder: s?.bankHolder ?? "" });
  return (
    <form action={action} className="space-y-4">
      <Panel className="p-5">
        <p className="text-[14px] font-semibold">입금 계좌</p>
        <p className="mt-0.5 mb-3 text-[12.5px] text-steel">거래처가 주문을 마치면 이 계좌가 바로 보입니다. 계좌번호는 &lsquo;복사&rsquo; 버튼으로 은행 앱에 붙여넣을 수 있습니다.</p>
        {!bank.account.trim() && (
          <p className="mb-3 flex items-start gap-2 rounded-md border border-status-warn/40 bg-status-warn/10 px-3 py-2 text-[13px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warn" />
            계좌번호가 비어 있어 지금은 거래처에게 &lsquo;입금 계좌는 전화로 안내해 드립니다&rsquo;라고 나옵니다.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <F id="ss-bank" label="은행">
            <Input id="ss-bank" name="bankName" value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })} placeholder="예: 국민은행" />
          </F>
          <F id="ss-acc" label="계좌번호">
            <Input id="ss-acc" name="bankAccount" value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value })} placeholder="예: 123456-78-901234" inputMode="numeric" />
          </F>
          <F id="ss-holder" label="예금주">
            <Input id="ss-holder" name="bankHolder" value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} placeholder="예: 라이더매니아" />
          </F>
        </div>
        {bank.account.trim() && (
          <div className="mt-4 max-w-sm overflow-hidden rounded-md border-2 border-primary/80">
            <p className="bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-primary-foreground">거래처 화면 미리보기 · 아래 계좌로 입금해 주세요</p>
            <dl className="space-y-1 px-3 py-2.5 text-[13.5px]">
              {bank.name.trim() && <div className="flex gap-3"><dt className="w-16 text-steel">은행</dt><dd className="font-semibold">{bank.name}</dd></div>}
              <div className="flex gap-3"><dt className="w-16 text-steel">계좌번호</dt><dd className="tabular font-semibold tracking-wide">{bank.account}</dd></div>
              {bank.holder.trim() && <div className="flex gap-3"><dt className="w-16 text-steel">예금주</dt><dd className="font-semibold">{bank.holder}</dd></div>}
            </dl>
          </div>
        )}
      </Panel>
      <Panel className="p-5">
        <F id="ss-onotice" label="주문 완료 안내문" hint="주문 직후 화면 맨 위에 보입니다. 입금 기한, 출고 시간 등을 적어 두세요.">
          <Textarea id="ss-onotice" name="orderNotice" defaultValue={s?.orderNotice ?? ""} rows={3} maxLength={1000} />
        </F>
      </Panel>
      <Panel className="p-5">
        <p className="mb-3 text-[14px] font-semibold">상품 화면 공지</p>
        <F id="ss-snotice" label="공지 (비워 두면 표시 안 함)" hint="예: 추석 연휴 9/28~10/3 출고 휴무">
          <Textarea id="ss-snotice" name="shopNotice" defaultValue={s?.shopNotice ?? ""} rows={2} maxLength={500} />
        </F>
      </Panel>
      <Panel className="p-5">
        <p className="mb-3 text-[14px] font-semibold">회사 정보 (거래명세서·출고증의 &lsquo;보내는 곳&rsquo;)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F id="ss-name" label="상호">
            <Input id="ss-name" name="companyName" defaultValue={s?.companyName ?? "라이더매니아"} required />
          </F>
          <F id="ss-ceo" label="대표자">
            <Input id="ss-ceo" name="ceoName" defaultValue={s?.ceoName ?? ""} />
          </F>
          <F id="ss-biz" label="사업자등록번호">
            <Input id="ss-biz" name="bizNo" defaultValue={s?.bizNo ? bizNo(s.bizNo) : ""} placeholder="123-45-67890" inputMode="numeric" />
          </F>
          <F id="ss-mail" label="통신판매업 신고번호">
            <Input id="ss-mail" name="mailOrderNo" defaultValue={s?.mailOrderNo ?? ""} placeholder="2026-서울성동-0000" />
          </F>
          <F id="ss-phone" label="문의 전화" hint="주문 화면 위쪽과 주문 완료 화면에 보이고, 누르면 바로 전화가 걸립니다.">
            <Input id="ss-phone" name="phone" defaultValue={s?.phone ?? ""} placeholder="010-0000-0000" inputMode="tel" />
          </F>
          <F id="ss-addr" label="주소">
            <Input id="ss-addr" name="address" defaultValue={s?.address ?? ""} />
          </F>
        </div>
      </Panel>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="h-10 px-6">
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </form>
  );
}
