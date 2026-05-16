import type { LucideIcon } from "lucide-react";
import {
  Home,
  Package,
  ClipboardList,
  Bell,
  User,
  Boxes,
  BarChart3,
  CheckCircle2,
  MoreHorizontal,
  Truck,
  PackagePlus,
  Settings,
} from "lucide-react";

export type Role = "super_admin" | "manager" | "supervisor" | "technician";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "approvals" | "notifications";
};

const technicianNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Catalog", href: "/catalog", icon: Package },
  { label: "Requests", href: "/requests", icon: ClipboardList },
  { label: "Notifications", href: "/notifications", icon: Bell, badgeKey: "notifications" },
  { label: "Profile", href: "/profile", icon: User },
];

const supervisorNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Approvals", href: "/requests", icon: CheckCircle2, badgeKey: "approvals" },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Notifications", href: "/notifications", icon: Bell, badgeKey: "notifications" },
  { label: "Profile", href: "/profile", icon: User },
];

const supervisorSidebarExtra: NavItem[] = [
  { label: "Receptions", href: "/receptions", icon: PackagePlus },
  { label: "Transfers", href: "/transfers", icon: Truck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const managerPrimary: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Requests", href: "/requests", icon: ClipboardList },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const managerSecondary: NavItem[] = [
  { label: "Receptions", href: "/receptions", icon: PackagePlus },
  { label: "Transfers", href: "/transfers", icon: Truck },
  { label: "Notifications", href: "/notifications", icon: Bell, badgeKey: "notifications" },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: User },
];

const moreItem: NavItem = {
  label: "More",
  href: "/more",
  icon: MoreHorizontal,
};

export function getBottomNav(role: Role): NavItem[] {
  switch (role) {
    case "technician":
      return technicianNav;
    case "supervisor":
      return supervisorNav;
    case "manager":
    case "super_admin":
      return [...managerPrimary, moreItem];
  }
}

export function getSidebarNav(role: Role): NavItem[] {
  switch (role) {
    case "technician":
      return technicianNav;
    case "supervisor":
      return [...supervisorNav, ...supervisorSidebarExtra];
    case "manager":
    case "super_admin":
      return [...managerPrimary, ...managerSecondary];
  }
}
