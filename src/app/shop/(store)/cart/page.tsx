import { requireCustomer } from "@/lib/shop";
import { CartClient } from "./cart-client";

export const metadata = { title: "장바구니" };

export default async function CartPage() {
  await requireCustomer();
  return <CartClient />;
}
