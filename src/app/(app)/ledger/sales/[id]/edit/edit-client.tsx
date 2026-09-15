"use client";
import { useRouter } from "next/navigation";
import { SaleForm, type SaleInitial, type PartnerOpt } from "../../../../entry/sale-form";

export function EditSaleClient(props: { partners: PartnerOpt[]; channels: string[]; isAdmin: boolean; today: string; initial: SaleInitial }) {
  const router = useRouter();
  return <SaleForm {...props} onSaved={() => { router.push(`/ledger/sales/${props.initial.orderId}`); router.refresh(); }} />;
}
