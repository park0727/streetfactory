"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** URL 쿼리스트링을 필터 상태로 쓰는 헬퍼. set() 은 page 를 초기화한다. */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = useCallback(
    (patch: Record<string, string | undefined | null>, opts?: { keepPage?: boolean }) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "" || v === "all") q.delete(k);
        else q.set(k, v);
      }
      if (!opts?.keepPage) q.delete("page");
      const qs = q.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, sp],
  );

  return { get: (k: string) => sp.get(k) ?? "", set, sp };
}

/** 입력값을 디바운스해서 URL 에 반영하는 검색창 상태 */
export function useDebouncedParam(key: string, delay = 300) {
  const { get, set } = useUrlFilters();
  const [value, setValue] = useState(get(key));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (value !== get(key)) set({ [key]: value });
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return [value, setValue] as const;
}
