"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CircleUser, EllipsisVertical, LogOut } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/actions";

import { getAvatarToneClass } from "@/lib/avatar";

type AdminProfile = {
  avatarUrl: string | null;
  email: string;
  role: "admin" | "member";
  userId: string;
  username: string;
};

function AdminUserMenuContent({ profile }: { profile: AdminProfile }) {
  const router = useRouter();
  const logout = useAction(logoutAction);

  const handleLogout = async () => {
    const result = await logout.executeAsync();

    if (result.data?.ok) {
      router.replace(result.data.redirectTo);
    }
  };

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} />
            <AvatarFallback className={`rounded-lg ${profile.avatarUrl ? "" : getAvatarToneClass(profile.userId)}`}>
              {getInitials(profile.username)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{profile.username}</span>
            <span className="truncate text-muted-foreground text-xs">{profile.email}</span>
          </div>
          <Badge variant="outline" className="ml-1">
            {profile.role}
          </Badge>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link prefetch={false} href="/admin">
            <CircleUser />
            Admin Home
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={logout.isPending}
        onSelect={(event) => {
          event.preventDefault();
          void handleLogout();
        }}
      >
        <LogOut />
        Logout
      </DropdownMenuItem>
    </>
  );
}

export function AdminShellUserMenu({ profile, variant }: { profile: AdminProfile; variant: "sidebar" | "topbar" }) {
  const { isMobile, state } = useSidebar();
  const shouldHideSidebarIdentity = state === "collapsed" && !isMobile;

  if (variant === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} />
                  <AvatarFallback
                    className={`rounded-lg ${profile.avatarUrl ? "" : getAvatarToneClass(profile.userId)}`}
                  >
                    {getInitials(profile.username)}
                  </AvatarFallback>
                </Avatar>
                <div className={shouldHideSidebarIdentity ? "hidden" : "grid flex-1 text-left text-sm leading-tight"}>
                  <span className="truncate font-medium">{profile.username}</span>
                  <span className="truncate text-muted-foreground text-xs">{profile.email}</span>
                </div>
                <EllipsisVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <AdminUserMenuContent profile={profile} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="size-8 rounded-full">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.username} />
            <AvatarFallback className={`rounded-full ${profile.avatarUrl ? "" : getAvatarToneClass(profile.userId)}`}>
              {getInitials(profile.username)}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <AdminUserMenuContent profile={profile} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
