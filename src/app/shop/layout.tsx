import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "라이더매니아 부품 주문", template: "%s · 라이더매니아" },
  description: "라이더매니아 거래처 전용 부품 주문",
  manifest: "/shop.webmanifest",
  appleWebApp: { capable: true, title: "라이더매니아", statusBarStyle: "black-translucent" },
  icons: { icon: "/shop-icon-192.png", apple: "/shop-icon-180.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#16243d" };

export default function ShopRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
