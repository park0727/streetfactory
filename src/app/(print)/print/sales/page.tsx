import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth";
import { str } from "@/lib/query-params";
import { PrintSheet } from "./print-sheet";
import { loadPrintDocs, parseIds } from "@/lib/print/sales-docs";
import { getShopSettings } from "@/lib/shop";

export const metadata = { title: "출고증 인쇄" };

export default async function PrintSalesPage({ searchParams }: PageProps<"/print/sales">) {
  await requireModule("parts");
  const sp = await searchParams;
  const ids = parseIds(str(sp, "ids"));
  if (ids.length === 0) notFound();
  const docs = await loadPrintDocs(ids);
  if (docs.length === 0) notFound();

  return <PrintSheet docs={docs} sender={await getShopSettings()} />;
}
