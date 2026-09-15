import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR, IBM_Plex_Mono, Barlow_Semi_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = IBM_Plex_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const mono = IBM_Plex_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const display = Barlow_Semi_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Streetfactory", template: "%s · Streetfactory" },
  description: "수입 오토바이 부품 재고·판매·거래처 관리",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#16243d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
