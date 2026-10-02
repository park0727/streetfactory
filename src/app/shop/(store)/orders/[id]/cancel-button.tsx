"use client";
import { ConfirmButton } from "@/components/confirm-button";
import { cancelMyOrder } from "../../../actions";

export function CancelOrderButton({ id, orderNo }: { id: number; orderNo: string }) {
  return (
    <ConfirmButton action={cancelMyOrder.bind(null, id)} title={`${orderNo} 주문 취소`} description="접수된 주문을 취소합니다. 이미 입금했다면 담당자에게 연락해 주세요." confirmLabel="주문 취소" destructive variant="outline" size="default" className="text-status-critical">
      주문 취소
    </ConfirmButton>
  );
}
