"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { AnyActionResult } from "@/lib/action-result";

/** useActionState 결과가 바뀔 때 토스트를 띄우고, 성공 시 콜백을 실행한다. */
export function useActionToast<S extends AnyActionResult>(state: S | undefined, onSuccess?: (s: Extract<S, { ok: true }>) => void) {
  const prev = useRef(state);
  useEffect(() => {
    if (state === prev.current) return;
    prev.current = state;
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.(state as Extract<S, { ok: true }>);
    } else {
      toast.error(state.error);
    }
  }, [state, onSuccess]);
}
