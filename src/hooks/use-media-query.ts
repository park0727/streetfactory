"use client";
import { useSyncExternalStore } from "react";

/** 미디어 쿼리 매칭. 서버·하이드레이션 시점에는 serverDefault 를 쓴다. */
export function useMediaQuery(query: string, serverDefault = true) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
