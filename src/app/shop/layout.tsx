import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Streetfactory 부품 주문", template: "%s · Streetfactory 주문" },
  description: "Streetfactory 거래처 전용 부품 주문",
  manifest: "/shop.webmanifest",
  appleWebApp: { capable: true, title: "SF 부품주문", statusBarStyle: "black-translucent" },
  icons: { icon: "/shop-icon-192.png", apple: "/shop-icon-180.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#16243d" };

export default function ShopRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
