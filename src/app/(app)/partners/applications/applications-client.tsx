"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, MapPin, MessageSquare, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/page-header";
import { bizNo as fmtBiz } from "@/lib/format";
import { PARTNER_TYPE } from "@/lib/dates";
import { PRICE_TIER } from "@/lib/pricing";
import { PAYMENT_TERMS } from "@/lib/payments-shared";
import { approveApplication, rejectApplication, type ApproveInput } from "./actions";

export type AppRow = {
  id: number;
  email: string;
  companyName: string;
  bizNo: string | null;
  contactName: string;
  phone: string;
  address: string | null;
  memo: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  partnerName: string | null;
};
type PartnerOpt = { id: number; code: string; name: string; bizNo: string | null; phone: string | null; isActive: boolean };

const digits = (s: string | null) => (s ?? "").replace(/\D/g, "");

/** 같은 사업자번호·연락처의 기존 거래처 */
function matchesFor(a: AppRow, partners: PartnerOpt[]) {
  const biz = digits(a.bizNo);
  const ph = digits(a.phone);
  return partners.filter((p) => (biz && digits(p.bizNo) === biz) || (ph.length >= 9 && digits(p.phone) === ph));
}

export function ApplicationsClient({ pending, partners }: { pending: AppRow[]; partners: PartnerOpt[] }) {
  const [approving, setApproving] = useState<AppRow | null>(null);
  const [rejecting, setRejecting] = useState<AppRow | null>(null);
  if (pending.length === 0)
    return (
      <Panel className="px-6 py-14 text-center">
        <p className="text-sm font-medium">기다리는 가입 신청이 없습니다</p>
        <p className="mt-1 text-[13px] text-steel">거래처가 주문 화면에서 가입 신청을 하면 여기에 나오고, 휴대폰 알림도 갑니다.</p>
      </Panel>
    );
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {pending.map((a) => {
          const dup = matchesFor(a, partners);
          return (
            <Panel key={a.id} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{a.companyName}</p>
                  <p className="text-[12px] text-steel">{new Date(a.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" })} 신청</p>
                </div>
                <span className="rounded-full bg-status-critical px-2 py-0.5 text-[11px] font-bold text-white">새 신청</span>
              </div>
              <dl className="grid gap-1.5 text-[13.5px]">
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-steel" /> {a.contactName} ·{" "}
                  <a href={`tel:${digits(a.phone)}`} className="font-medium underline underline-offset-2">
                    {a.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-steel" /> 로그인 이메일 <span className="font-medium">{a.email}</span>
                </div>
                {a.bizNo && <div className="pl-6 text-steel">사업자등록번호 {fmtBiz(a.bizNo)}</div>}
                {a.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-steel" /> {a.address}
                  </div>
                )}
                {a.memo && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-steel" /> <span className="whitespace-pre-line">{a.memo}</span>
                  </div>
                )}
              </dl>
              {dup.length > 0 && (
                <p className="rounded-md border border-status-warn/40 bg-status-warn/10 px-3 py-2 text-[12.5px]">
                  이미 등록된 거래처와 사업자번호·연락처가 같습니다: <b>{dup.map((p) => p.name).join(", ")}</b>. 승인할 때 &lsquo;기존 거래처에 연결&rsquo;을 고를 수 있습니다.
                </p>
              )}
              <div className="flex gap-2">
                <Button className="h-10 flex-1" onClick={() => setApproving(a)}>
                  <Check /> 승인하기
                </Button>
                <Button variant="outline" className="h-10" onClick={() => setRejecting(a)}>
                  <X /> 거절
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
      {approving && <ApproveDialog key={approving.id} app={approving} partners={partners} onClose={() => setApproving(null)} />}
      {rejecting && <RejectDialog key={rejecting.id} app={rejecting} onClose={() => setRejecting(null)} />}
    </>
  );
}

function ApproveDialog({ app, partners, onClose }: { app: AppRow; partners: PartnerOpt[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dup = useMemo(() => matchesFor(app, partners), [app, partners]);
  const [mode, setMode] = useState<"new" | "existing">(dup.length ? "existing" : "new");
  const [partnerId, setPartnerId] = useState<string>(dup[0] ? String(dup[0].id) : "");
  const [p, setP] = useState<ApproveInput["partner"]>({
    name: app.companyName,
    type: "dealer",
    bizNo: app.bizNo ? fmtBiz(app.bizNo) : "",
    contactName: app.contactName,
    phone: app.phone,
    address: app.address ?? "",
    priceTier: "retail",
    discountRate: 0,
    defaultTerms: "immediate",
    defaultVat: false,
  });
  const [discount, setDiscount] = useState("");
  const [accountName, setAccountName] = useState(app.contactName);
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((x) => ({ ...x, [k]: v }));

  const submit = () =>
    start(async () => {
      const r = await approveApplication({ id: app.id, mode, partnerId: mode === "existing" ? Number(partnerId) || undefined : undefined, accountName, partner: { ...p, discountRate: discount.trim() === "" ? 0 : Number(discount) } });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      onClose();
      router.refresh();
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{app.companyName} 승인</DialogTitle>
          <DialogDescription>승인하면 {app.email} 계정으로 바로 주문할 수 있습니다. 비밀번호는 신청자가 정한 그대로입니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["new", "existing"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md border px-3 py-2 text-left ${mode === m ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}
              >
                <span className="block text-[13.5px] font-medium">{m === "new" ? "새 거래처로 등록" : "기존 거래처에 연결"}</span>
                <span className="block text-[11.5px] text-steel">{m === "new" ? "신청 내용으로 거래처를 새로 만듭니다" : "이미 거래하던 곳이면 계정만 붙입니다"}</span>
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <div className="space-y-1.5">
              <Label>연결할 거래처</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="거래처를 고르세요" />
                </SelectTrigger>
                <SelectContent>
                  {[...dup, ...partners.filter((x) => x.isActive && !dup.some((d) => d.id === x.id))].map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {x.name} ({x.code}){dup.some((d) => d.id === x.id) ? " · 같은 사업자번호·연락처" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ap-name">거래처명</Label>
                <Input id="ap-name" value={p.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select value={p.type} onValueChange={(v) => set("type", v as typeof p.type)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PARTNER_TYPE).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-biz">사업자등록번호</Label>
                <Input id="ap-biz" value={p.bizNo} onChange={(e) => set("bizNo", e.target.value)} placeholder="123-45-67890" inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-contact">담당자</Label>
                <Input id="ap-contact" value={p.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-phone">연락처</Label>
                <Input id="ap-phone" value={p.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ap-addr">주소</Label>
                <Input id="ap-addr" value={p.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>온라인 주문 기준가</Label>
                <Select value={p.priceTier} onValueChange={(v) => set("priceTier", v as typeof p.priceTier)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRICE_TIER).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-disc">추가 할인 (%)</Label>
                <Input id="ap-disc" type="number" inputMode="decimal" min={0} max={90} step={0.5} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="text-right" />
              </div>
              <div className="space-y-1.5">
                <Label>기본 결제 조건</Label>
                <Select value={p.defaultTerms} onValueChange={(v) => set("defaultTerms", v as typeof p.defaultTerms)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_TERMS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-[13.5px]">
                <input type="checkbox" className="size-4" checked={p.defaultVat} onChange={(e) => set("defaultVat", e.target.checked)} /> 부가세 별도 청구 (세금계산서)
              </label>
            </div>
          )}

          <div className="space-y-1.5 rounded-md bg-muted/60 p-3">
            <Label htmlFor="ap-acc">주문 계정 사용자 이름</Label>
            <Input id="ap-acc" value={accountName} onChange={(e) => setAccountName(e.target.value)} maxLength={50} className="bg-card" />
            <p className="text-[12px] text-steel">로그인 이메일: {app.email}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "승인하는 중…" : "승인하고 주문 계정 열기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ app, onClose }: { app: AppRow; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{app.companyName} 신청 거절</DialogTitle>
          <DialogDescription>신청자의 로그인 계정을 지웁니다. 같은 이메일로 다시 신청할 수 있습니다. 거절했다는 안내는 따로 가지 않으니 필요하면 전화로 알려 주세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rj-reason">거절 사유 (관리용 메모, 선택)</Label>
          <Textarea id="rj-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="예: 사업자 확인 불가" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await rejectApplication(app.id, reason);
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                onClose();
                router.refresh();
              })
            }
          >
            {pending ? "처리 중…" : "거절하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
