"use client";
import { useActionState } from "react";
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
  return (
    <form action={action} className="space-y-4">
      <Panel className="p-5">
        <p className="mb-3 text-[14px] font-semibold">입금 안내</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <F id="ss-bank" label="은행">
            <Input id="ss-bank" name="bankName" defaultValue={s?.bankName ?? ""} placeholder="예: 국민은행" />
          </F>
          <F id="ss-acc" label="계좌번호">
            <Input id="ss-acc" name="bankAccount" defaultValue={s?.bankAccount ?? ""} placeholder="123456-78-901234" inputMode="numeric" />
          </F>
          <F id="ss-holder" label="예금주">
            <Input id="ss-holder" name="bankHolder" defaultValue={s?.bankHolder ?? ""} />
          </F>
          <F id="ss-onotice" label="주문 완료 안내문" className="sm:col-span-3" hint="주문 직후 화면 맨 위에 보입니다. 입금 기한, 출고 시간 등을 적어 두세요.">
            <Textarea id="ss-onotice" name="orderNotice" defaultValue={s?.orderNotice ?? ""} rows={3} maxLength={1000} />
          </F>
        </div>
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
            <Input id="ss-name" name="companyName" defaultValue={s?.companyName ?? "Streetfactory"} required />
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
          <F id="ss-phone" label="대표 전화">
            <Input id="ss-phone" name="phone" defaultValue={s?.phone ?? ""} />
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
