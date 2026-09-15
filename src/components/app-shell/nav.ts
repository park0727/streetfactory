import {
  LayoutDashboard,
  Package,
  Boxes,
  ArrowLeftRight,
  Building2,
  BookOpenText,
  Receipt,
  Ship,
  Users,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: "업무",
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard },
      { href: "/entry", label: "입출고 등록", icon: ArrowLeftRight },
      { href: "/inventory", label: "재고 현황", icon: Boxes },
      { href: "/parts", label: "부품 마스터", icon: Package },
      { href: "/partners", label: "거래처", icon: Building2 },
    ],
  },
  {
    title: "원장",
    items: [
      { href: "/ledger/partners", label: "거래처 원장", icon: BookOpenText },
      { href: "/ledger/sales", label: "판매 원장", icon: Receipt },
      { href: "/ledger/inbound", label: "입고 원장", icon: Ship },
    ],
  },
  {
    title: "설정",
    items: [
      { href: "/settings/users", label: "사용자 관리", icon: Users, adminOnly: true },
      { href: "/settings/master", label: "기준 데이터", icon: Settings2 },
    ],
  },
];

/** 모바일 하단 탭에 노출할 핵심 4개 */
export const MOBILE_TABS = ["/", "/entry", "/inventory", "/parts"];
