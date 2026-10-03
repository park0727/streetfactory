"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, BellOff, Send, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InstallApp, useInstallEnv } from "../../../shop/install-app";
import { removeMyDevice, removePushSubscription, savePushSubscription, sendTestPush } from "./push-actions";

type Device = { id: number; device: string | null; createdAt: string; lastSuccessAt: string | null; endpoint: string };

function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "아이폰" : /iPad/.test(ua) ? "아이패드" : /Android/.test(ua) ? "안드로이드" : /Windows/.test(ua) ? "윈도우 PC" : /Mac/.test(ua) ? "맥" : "기기";
  const br = /SamsungBrowser/.test(ua) ? "삼성 인터넷" : /Edg\//.test(ua) ? "엣지" : /CriOS|Chrome/.test(ua) ? "크롬" : /Safari/.test(ua) ? "사파리" : /Firefox/.test(ua) ? "파이어폭스" : "";
  return [os, br].filter(Boolean).join(" · ");
}

const b64uToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export function PushSetup({ devices, vapidKey }: { devices: Device[]; vapidKey: string | undefined }) {
  const router = useRouter();
  const env = useInstallEnv();
  const [state, setState] = useState<"checking" | "unsupported" | "need-install" | "denied" | "off" | "on">("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(ios ? "need-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/admin-sw.js", { scope: "/" });
      const sub = await reg.pushManager.getSubscription();
      if (sub && devices.some((d) => d.endpoint === sub.endpoint)) {
        setEndpoint(sub.endpoint);
        setState("on");
      } else setState("off");
    })().catch(() => setState("unsupported"));
  }, [devices]);

  function enable() {
    start(async () => {
      try {
        if (!vapidKey) throw new Error("알림 키가 설정되지 않았습니다.");
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setState(perm === "denied" ? "denied" : "off");
          toast.error("알림을 허용해야 받을 수 있습니다.");
          return;
        }
        const reg = await navigator.serviceWorker.register("/admin-sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(vapidKey) }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const r = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, device: deviceName() });
        if (!r.ok) throw new Error(r.error);
        toast.success(r.message);
        setEndpoint(json.endpoint);
        setState("on");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "알림을 켜지 못했습니다.");
      }
    });
  }

  function disable() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
      setEndpoint(null);
      toast.success("이 기기의 주문 알림을 껐습니다.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {state === "checking" && <p className="text-sm text-steel">확인 중…</p>}
      {state === "unsupported" && <p className="text-sm text-steel">이 브라우저는 알림을 지원하지 않습니다. 휴대폰의 크롬·사파리나 PC 크롬에서 열어 주세요.</p>}
      {state === "need-install" && (
        <div className="space-y-3 rounded-md border border-status-warn/40 bg-status-warn/5 p-4 text-[14px]">
          <p className="font-medium">아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다.</p>
          <ol className="list-decimal space-y-1 pl-5 text-[13.5px]">
            <li>아래 버튼을 눌러 이 화면을 홈 화면에 추가합니다.</li>
            <li>홈 화면에 생긴 <b>RM 관리</b> 아이콘으로 다시 엽니다.</li>
            <li>로그인한 뒤 내 정보에서 &lsquo;이 휴대폰으로 주문 알림 받기&rsquo;를 누릅니다.</li>
          </ol>
          <InstallApp app="admin" />
          <p className="text-[12px] text-steel">iOS 16.4 이상이 필요합니다. 설정 → 일반 → 정보에서 버전을 확인할 수 있습니다.</p>
        </div>
      )}
      {state === "denied" && (
        <div className="space-y-1.5 rounded-md border border-status-critical/30 bg-status-critical/5 p-4 text-[13.5px]">
          <p className="font-medium text-status-critical">이 기기에서 알림이 차단되어 있습니다.</p>
          <p>
            {env === "ios"
              ? "아이폰 설정 → 알림 → RM 관리 에서 알림 허용을 켜 주세요."
              : "주소창 왼쪽 자물쇠(또는 ⓘ) 아이콘 → 알림 → 허용으로 바꾼 뒤 이 화면을 새로 열어 주세요."}
          </p>
        </div>
      )}
      {state === "off" && (
        <Button className="h-11 w-full sm:w-auto" onClick={enable} disabled={pending}>
          <BellRing /> {pending ? "켜는 중…" : "이 기기로 주문 알림 받기"}
        </Button>
      )}
      {state === "on" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md bg-status-ok/10 px-3 py-2 text-[13.5px] font-medium text-status-ok">
            <BellRing className="size-4" /> 이 기기로 주문 알림을 받는 중
          </span>
          <Button
            variant="outline"
            onClick={() =>
              start(async () => {
                const r = await sendTestPush();
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
            disabled={pending}
          >
            <Send /> 테스트 알림 보내기
          </Button>
          <Button variant="ghost" className="text-steel" onClick={disable} disabled={pending}>
            <BellOff /> 이 기기 알림 끄기
          </Button>
        </div>
      )}

      {devices.length > 0 && (
        <div>
          <p className="th-label mb-1.5">알림 받는 기기</p>
          <ul className="divide-y rounded-md border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                <Smartphone className="size-4 shrink-0 text-steel" />
                <span className="min-w-0 flex-1">
                  {d.device ?? "기기"}
                  {d.endpoint === endpoint && <span className="ml-1.5 text-[11.5px] text-primary">(지금 이 기기)</span>}
                  <span className="block text-[11.5px] text-steel">
                    등록 {d.createdAt.slice(0, 10)}
                    {d.lastSuccessAt && ` · 마지막 알림 ${d.lastSuccessAt.slice(0, 16).replace("T", " ")}`}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="이 기기 빼기"
                  title="빼기"
                  onClick={() =>
                    start(async () => {
                      const r = await removeMyDevice(d.id);
                      if (r.ok) {
                        toast.success(r.message);
                        router.refresh();
                      }
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
