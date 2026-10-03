import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customerAccounts, partners, shopSettings } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Customer = {
  id: string;
  name: string;
  email: string;
  mustChangePassword: boolean;
  partnerId: number;
  partnerName: string;
  priceTier: "retail" | "wholesale";
  discountRate: number;
  vatApplied: boolean;
};

/** 현재 로그인한 고객(거래처 주문 계정). 직원이거나 비로그인이면 null. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const [c] = await db
    .select({
      id: customerAccounts.id,
      name: customerAccounts.name,
      email: customerAccounts.email,
      mustChangePassword: customerAccounts.mustChangePassword,
      isActive: customerAccounts.isActive,
      partnerId: partners.id,
      partnerName: partners.name,
      partnerActive: partners.isActive,
      priceTier: partners.priceTier,
      discountRate: partners.discountRate,
      vatApplied: partners.defaultVat,
    })
    .from(customerAccounts)
    .innerJoin(partners, eq(partners.id, customerAccounts.partnerId))
    .where(eq(customerAccounts.id, uid));
  if (!c || !c.isActive || !c.partnerActive) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    mustChangePassword: c.mustChangePassword,
    partnerId: c.partnerId,
    partnerName: c.partnerName,
    priceTier: c.priceTier,
    discountRate: Number(c.discountRate),
    vatApplied: c.vatApplied,
  };
});

export async function requireCustomer(): Promise<Customer> {
  const c = await getCustomer();
  if (!c) redirect("/login"); // shop. 주소의 거래처 로그인
  return c;
}

export const getShopSettings = cache(async () => {
  const [s] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  return s ?? null;
});
