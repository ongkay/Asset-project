"use client";

import Link from "next/link";
import { Command } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { APP_CONFIG } from "@/config/app-config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { AdminShellNavMain } from "./admin-shell-nav-main";
import { AdminShellUserMenu } from "./admin-shell-user-menu";

type AdminProfile = {
  avatarUrl: string | null;
  email: string;
  role: "admin" | "member";
  userId: string;
  username: string;
};

export function AdminShellSidebar({
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  profile: AdminProfile;
}) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="group-data-[collapsible=icon]/sidebar-wrapper:justify-center">
              <Link prefetch={false} href="/admin">
                <Command className="size-4" />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AdminShellNavMain />
      </SidebarContent>
      <SidebarFooter>
        <AdminShellUserMenu profile={profile} variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  );
}
