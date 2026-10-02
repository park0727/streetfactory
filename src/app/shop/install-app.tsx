"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, ExternalLink, Share, SquarePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// beforeinstallprompt 는 페이지 로드 직후 한 번 오므로 전역에 잡아 둔다
let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));

type Env = "installed" | "ios" | "inapp-ios" | "inapp-android" | "android" | "desktop";
function detect(): Env {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(ua);
  if (inapp) return ios ? "inapp-ios" : "inapp-android";
  if (ios) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function useEnv() {
  // 서버에서는 'installed' 로 두어 버튼을 그리지 않고, 브라우저에서 판별한다
  return useSyncExternalStore(
    () => () => {},
    () => detect(),
    () => "installed" as Env,
  );
}

/** 서비스 워커 등록 (안드로이드 설치 조건) */
function useRegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/shop-sw.js", { scope: "/shop" }).catch(() => {});
  }, []);
}

function openInBrowser(env: Env) {
  const url = window.location.origin + "/shop";
  if (env === "inapp-android") {
    window.location.href = `intent://${window.location.host}/shop#Intent;scheme=https;package=com.android.chrome;end`;
  } else if (/KAKAOTALK/i.test(navigator.userAgent)) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  } else {
    navigator.clipboard?.writeText(url).then(() => toast.success("주소를 복사했습니다. 사파리를 열고 주소창에 붙여넣어 주세요."));
  }
}

/** 홈 화면 추가 버튼. variant=banner 는 상품 화면 상단용 (닫으면 7일간 숨김) */
export function InstallApp({ variant = "button", className }: { variant?: "button" | "banner"; className?: string }) {
  useRegisterSW();
  const env = useEnv();
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const [guide, setGuide] = useState(false);
  const [hidden, setHidden] = useState(false);
  const dismissedRecently = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return Number(localStorage.getItem("sf-install-dismissed") ?? 0) > Date.now() - 7 * 864e5;
      } catch {
        return false;
      }
    },
    () => true,
  );

  if (env === "installed" || env === "desktop") return null;
  if (variant === "banner" && (hidden || dismissedRecently)) return null;

  async function onClick() {
    if (env === "inapp-android" || env === "inapp-ios") return setGuide(true);
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") toast.success("홈 화면에 추가했습니다. 이제 아이콘을 눌러 바로 열 수 있어요.");
      deferred = null;
      return;
    }
    setGuide(true);
  }

  const label = env.startsWith("inapp") ? "인터넷 앱으로 열고 홈 화면에 추가" : "홈 화면에 앱으로 추가";

  return (
    <>
      {variant === "banner" ? (
        <div className={cn("flex items-center gap-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5", className)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 아이콘 */}
          <img src="/shop-icon-192.png" alt="" className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">앱처럼 쓰기</p>
            <p className="text-[12px] text-steel">홈 화면에 아이콘을 만들어 두면 다음부터 바로 열립니다.</p>
          </div>
          <Button size="sm" onClick={onClick}>
            {canPrompt ? "설치" : "추가하기"}
          </Button>
          <button
            type="button"
            className="rounded p-1 text-steel"
            aria-label="닫기"
            onClick={() => {
              try {
                localStorage.setItem("sf-install-dismissed", String(Date.now()));
              } catch {}
              setHidden(true);
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <Button variant="outline" className={cn("h-11 w-full", className)} onClick={onClick}>
          <Download /> {label}
        </Button>
      )}

      <Dialog open={guide} onOpenChange={setGuide}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>홈 화면에 추가하기</DialogTitle>
            <DialogDescription>한 번만 해 두면 다음부터 아이콘을 눌러 바로 주문 화면이 열립니다.</DialogDescription>
          </DialogHeader>
          {env === "inapp-android" || env === "inapp-ios" ? (
            <div className="space-y-3 text-[14px]">
              <p>지금은 카카오톡 같은 앱 안에서 열려 있어서 홈 화면에 추가할 수 없습니다. 아래 버튼을 눌러 {env === "inapp-ios" ? "사파리" : "크롬"}에서 다시 열어 주세요.</p>
              <Button className="h-11 w-full" onClick={() => openInBrowser(env)}>
                <ExternalLink /> {env === "inapp-ios" ? "사파리로 열기" : "크롬으로 열기"}
              </Button>
              <p className="text-[12.5px] text-steel">열린 뒤 다시 로그인하고 &lsquo;홈 화면에 추가&rsquo; 버튼을 누르면 됩니다.</p>
            </div>
          ) : env === "ios" ? (
            <ol className="space-y-3 text-[14px]">
              <li className="flex gap-3">
                <Step n={1} />
                <span>
                  화면 아래쪽(또는 위쪽)의 <b>공유 버튼</b> <Share className="inline size-4 align-[-2px] text-primary" /> 을 누릅니다.
                </span>
              </li>
              <li className="flex gap-3">
                <Step n={2} />
                <span>
                  목록을 아래로 내려 <b>&lsquo;홈 화면에 추가&rsquo;</b> <SquarePlus className="inline size-4 align-[-2px] text-primary" /> 를 누릅니다.
                </span>
              </li>
              <li className="flex gap-3">
                <Step n={3} />
                <span>
                  오른쪽 위 <b>&lsquo;추가&rsquo;</b>를 누르면 홈 화면에 <b>SF 부품주문</b> 아이콘이 생깁니다.
                </span>
              </li>
              <li className="rounded-md bg-muted px-3 py-2 text-[12.5px] text-steel">공유 버튼이 안 보이면 화면을 살짝 위로 밀어 보세요. 사파리가 아닌 다른 앱이면 사파리로 열어 주세요.</li>
            </ol>
          ) : (
            <ol className="space-y-3 text-[14px]">
              <li className="flex gap-3">
                <Step n={1} />
                <span>
                  크롬 오른쪽 위 <b>점 세 개(⋮)</b> 메뉴를 누릅니다.
                </span>
              </li>
              <li className="flex gap-3">
                <Step n={2} />
                <span>
                  <b>&lsquo;홈 화면에 추가&rsquo;</b> 또는 <b>&lsquo;앱 설치&rsquo;</b>를 누릅니다.
                </span>
              </li>
              <li className="flex gap-3">
                <Step n={3} />
                <span>
                  <b>&lsquo;설치&rsquo;</b>(또는 &lsquo;추가&rsquo;)를 누르면 홈 화면에 아이콘이 생깁니다.
                </span>
              </li>
              <li className="rounded-md bg-muted px-3 py-2 text-[12.5px] text-steel">삼성 인터넷은 아래쪽 메뉴(☰) → &lsquo;현재 페이지 추가&rsquo; → &lsquo;홈 화면&rsquo;입니다.</li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">{n}</span>;
}
