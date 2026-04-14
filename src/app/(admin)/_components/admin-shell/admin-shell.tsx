"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { AdminShellHeader } from "./admin-shell-header";
import { AdminShellSidebar } from "./admin-shell-sidebar";

type AdminProfile = {
  avatarUrl: string | null;
  email: string;
  role: "admin" | "member";
  userId: string;
  username: string;
};

export function AdminShell({
  children,
  profile,
  defaultOpen,
  variant,
  collapsible,
}: {
  children: ReactNode;
  profile: AdminProfile;
  defaultOpen: boolean;
  variant: "sidebar" | "floating" | "inset";
  collapsible: "offcanvas" | "icon" | "none";
}) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <AdminShellSidebar profile={profile} variant={variant} collapsible={collapsible} />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
        )}
      >
        <AdminShellHeader profile={profile} />
        <div className="h-full p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
