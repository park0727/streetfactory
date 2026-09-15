import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { vInventory } from "@/db/schema";
import { getProfile } from "@/lib/auth";

export async function GET() {
  const me = await getProfile();
  if (!me || !me.isActive || (!me.canParts && me.role !== "admin")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db.select().from(vInventory).orderBy(asc(vInventory.code));
  return NextResponse.json(rows);
}
