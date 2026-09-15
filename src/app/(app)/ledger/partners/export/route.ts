import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { isDate } from "@/lib/dates";
import { salesLineQuery, salesLineWhere } from "../../queries";

export async function GET(req: NextRequest) {
  const me = await getProfile();
  if (!me || !me.isActive || (!me.canParts && me.role !== "admin")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const partnerId = Number(sp.get("partner")) || undefined;
  const rows = await salesLineQuery(salesLineWhere({ from: isDate(from) ? from : undefined, to: isDate(to) ? to : undefined, partnerId, q: sp.get("q") || undefined }), "date_asc").limit(20000);
  return NextResponse.json(rows);
}
