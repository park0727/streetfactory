"use client";
import { useRouter } from "next/navigation";
import { InboundForm, type InboundInitial } from "../../../../entry/inbound-form";

export function EditInboundClient(props: { suppliers: { id: number; name: string; country: string }[]; today: string; initial: InboundInitial }) {
  const router = useRouter();
  return <InboundForm {...props} onSaved={() => { router.push(`/ledger/inbound/${props.initial.orderId}`); router.refresh(); }} />;
}
