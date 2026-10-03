"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type B = { id: number; imageUrl: string; title: string | null; linkUrl: string | null };

/** 주문 화면 상단 배너: 3초마다 자동으로 넘어가고, 손가락으로 넘길 수 있다. */
export function BannerCarousel({ items, interval = 3000 }: { items: B[]; interval?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (paused.current || document.visibilityState !== "visible") return;
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % items.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, interval);
    return () => clearInterval(t);
  }, [items.length, interval]);

  if (items.length === 0) return null;
  return (
    <div className="relative -mx-4 sm:mx-0" onPointerDown={() => (paused.current = true)} onPointerUp={() => setTimeout(() => (paused.current = false), 4000)}>
      <div
        ref={ref}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:rounded-md [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="광고"
      >
        {items.map((b, i) => {
          // eslint-disable-next-line @next/next/no-img-element -- 업로드 배너
          const img = <img src={b.imageUrl} alt={b.title ?? "광고"} className="aspect-[2/1] w-full object-cover" loading={i === 0 ? "eager" : "lazy"} draggable={false} />;
          return (
            <div key={b.id} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} / ${items.length}`}>
              {b.linkUrl ? <Link href={b.linkUrl}>{img}</Link> : img}
            </div>
          );
        })}
      </div>
      {items.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
          {items.map((b, i) => (
            <span key={b.id} className={cn("h-1.5 rounded-full bg-white/60 shadow transition-all", i === idx ? "w-5 bg-white" : "w-1.5")} />
          ))}
        </div>
      )}
    </div>
  );
}
