"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

import { AdminShellBreadcrumbs } from "./admin-shell-breadcrumbs";
import { AdminShellLayoutControls } from "./admin-shell-layout-controls";
import { AdminShellQuickCreate } from "./admin-shell-quick-create";
import { AdminShellThemeSwitcher } from "./admin-shell-theme-switcher";
import { AdminShellUserMenu } from "./admin-shell-user-menu";

type AdminProfile = {
  avatarUrl: string | null;
  email: string;
  role: "admin" | "member";
  userId: string;
  username: string;
};

export function AdminShellHeader({ profile }: { profile: AdminProfile }) {
  return (
    <header
      className={[
        "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
      ].join(" ")}
    >
      <div className="flex w-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
          />
          <div className="min-w-0">
            <AdminShellBreadcrumbs />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminShellQuickCreate />
          <AdminShellLayoutControls />
          <AdminShellThemeSwitcher />
          <AdminShellUserMenu profile={profile} variant="topbar" />
        </div>
      </div>
    </header>
  );
}
