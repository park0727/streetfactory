"use client";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteSale } from "./sales/actions";
import { deleteInbound } from "./inbound/actions";

/** 원장 목록·상세에서 쓰는 수정/삭제 버튼 */
export function LedgerRowActions({ kind, id, docNo, size = "icon-sm", withLabels }: { kind: "sales" | "inbound"; id: number; docNo: string; size?: "icon-sm" | "sm"; withLabels?: boolean }) {
  const action = kind === "sales" ? deleteSale.bind(null, id) : deleteInbound.bind(null, id);
  const desc =
    kind === "sales"
      ? "전표와 라인을 지우고 차감했던 재고를 되돌립니다. 되돌릴 수 없습니다."
      : "전표를 지우고 입고 수량을 되돌리며 해당 부품의 평균원가를 다시 계산합니다. 이미 판매된 라인의 원가 스냅샷은 바뀌지 않습니다.";
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
      <Button variant={withLabels ? "outline" : "ghost"} size={size} asChild title="수정" aria-label={`${docNo} 수정`}>
        <Link href={`/ledger/${kind}/${id}/edit`}>
          <Pencil /> {withLabels && "수정"}
        </Link>
      </Button>
      <ConfirmButton
        action={action}
        title={`${docNo} 삭제`}
        description={desc}
        confirmLabel="삭제"
        destructive
        variant={withLabels ? "outline" : "ghost"}
        size={size}
        className={withLabels ? "text-status-critical" : "text-steel hover:text-status-critical"}
        label={`${docNo} 삭제`}
      >
        <Trash2 /> {withLabels && "삭제"}
      </ConfirmButton>
    </span>
  );
}
