import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth";
import { str } from "@/lib/query-params";
import { DuplexSheet } from "./duplex-sheet";
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

  return <DuplexSheet docs={docs} sender={await getShopSettings()} />;
}
