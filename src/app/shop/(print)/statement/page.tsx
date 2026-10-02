import { notFound } from "next/navigation";
import { getShopSettings, requireCustomer } from "@/lib/shop";
import { str } from "@/lib/query-params";
import { loadPrintDocs, parseIds } from "@/lib/print/sales-docs";
import { PrintSheet } from "../../../(print)/print/sales/print-sheet";

export const metadata = { title: "거래명세서" };

export default async function StatementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireCustomer();
  const ids = parseIds(str(await searchParams, "ids"));
  if (ids.length === 0) notFound();
  const docs = await loadPrintDocs(ids, me.partnerId); // 자기 거래처 전표만
  if (docs.length === 0) notFound();
  return <PrintSheet docs={docs} sender={await getShopSettings()} defaultWithPrice allowToggle={false} />;
}
