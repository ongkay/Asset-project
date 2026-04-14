import { HardDrive, History, KeyRound, LayoutDashboard, Package, type LucideIcon, UserCog, Users } from "lucide-react";

export type AdminNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ href: "/admin", icon: LayoutDashboard, label: "Home" }],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { href: "/admin/package", icon: Package, label: "Package" },
      { href: "/admin/assets", icon: HardDrive, label: "Assets" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/subscriber", icon: UserCog, label: "Subscriber" },
      { href: "/admin/cdkey", icon: KeyRound, label: "CD-Key" },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { href: "/admin/users", icon: Users, label: "Users" },
      { href: "/admin/userlogs", icon: History, label: "User Logs" },
    ],
  },
];

export const ADMIN_BREADCRUMB_LABELS: Record<string, string> = {
  "/admin": "Home",
  "/admin/package": "Package",
  "/admin/assets": "Assets",
  "/admin/subscriber": "Subscriber",
  "/admin/cdkey": "CD-Key",
  "/admin/users": "Users",
  "/admin/userlogs": "User Logs",
};

export const ADMIN_QUICK_CREATE_ITEMS: AdminNavItem[] = [
  { href: "/admin/package", icon: Package, label: "New Package" },
  { href: "/admin/assets", icon: HardDrive, label: "New Asset" },
  { href: "/admin/subscriber", icon: UserCog, label: "New Subscriber" },
  { href: "/admin/cdkey", icon: KeyRound, label: "New CD-Key" },
  { href: "/admin/users", icon: Users, label: "New User" },
];

export function getAdminBreadcrumbLabel(pathname: string) {
  return ADMIN_BREADCRUMB_LABELS[pathname] ?? "Home";
}

export function isAdminRouteActive(pathname: string, href: string) {
  return pathname === href;
}
