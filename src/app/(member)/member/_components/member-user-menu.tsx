"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CircleUserRound, Gift, LogOut, RefreshCw } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/actions";
import type { AuthProfile } from "@/modules/auth/types";

import { MEMBER_PAGE_CONTENT } from "./member-page-content";

type MemberUserMenuProps = {
  onOpenRedeem: () => void;
  profile: AuthProfile;
};

export function applySuccessfulLogoutRedirect(input: {
  redirectTo: string;
  router: { replace: (href: string) => void };
}) {
  input.router.replace(input.redirectTo);
}

export function MemberUserMenu({ onOpenRedeem, profile }: MemberUserMenuProps) {
  const router = useRouter();
  const logout = useAction(logoutAction);

  const dropdownItemClassName =
    "text-[#a7afbd] outline-hidden transition [&_svg]:text-[#7b8190] data-[highlighted]:bg-[#1d2330] data-[highlighted]:text-white data-[highlighted]:[&_svg]:text-cyan-400 focus:bg-[#1d2330] focus:text-white focus:[&_svg]:text-cyan-400 hover:bg-[#1d2330] hover:text-white hover:[&_svg]:text-cyan-400";
  const destructiveDropdownItemClassName =
    "text-red-300 outline-hidden transition [&_svg]:text-red-300 data-[highlighted]:bg-red-500/12 data-[highlighted]:text-red-200 data-[highlighted]:[&_svg]:text-red-300 focus:bg-red-500/12 focus:text-red-200 focus:[&_svg]:text-red-300 hover:bg-red-500/12 hover:text-red-200 hover:[&_svg]:text-red-300";

  async function handleLogout() {
    const result = await logout.executeAsync();

    if (result.data?.ok) {
      applySuccessfulLogoutRedirect({ redirectTo: result.data.redirectTo, router });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-auto rounded-full border border-white/10 bg-transparent px-2 py-1.5 text-white hover:border-white/15 hover:bg-white/5 hover:text-white focus-visible:text-white aria-expanded:border-white/15 aria-expanded:bg-white/5 aria-expanded:text-white"
          variant="ghost"
        >
          <Avatar className="size-9 rounded-full">
            <AvatarImage alt={profile.username} src={profile.avatarUrl || undefined} />
            <AvatarFallback
              className={profile.avatarUrl ? "rounded-full" : `rounded-full ${getAvatarToneClass(profile.userId)}`}
            >
              {getInitials(profile.username)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden flex-col items-start text-left sm:flex">
            <span className="max-w-36 truncate text-sm font-semibold text-white">{profile.username}</span>
            <span className="text-[#7b8190] text-xs">{MEMBER_PAGE_CONTENT.userMenu.roleLabel}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border border-[#2b313d] bg-[#171b24] text-[#a7afbd] shadow-[0_20px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar className="size-10 rounded-full">
              <AvatarImage alt={profile.username} src={profile.avatarUrl || undefined} />
              <AvatarFallback
                className={profile.avatarUrl ? "rounded-full" : `rounded-full ${getAvatarToneClass(profile.userId)}`}
              >
                {getInitials(profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{profile.username}</p>
              <p className="truncate text-[#7b8190] text-xs">{profile.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/8" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className={dropdownItemClassName}>
            <Link href="/member" prefetch={false}>
              <CircleUserRound />
              {MEMBER_PAGE_CONTENT.userMenu.accountLabel}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={dropdownItemClassName}
            onSelect={() => {
              onOpenRedeem();
            }}
          >
            <Gift />
            {MEMBER_PAGE_CONTENT.userMenu.redeemLabel}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={dropdownItemClassName}>
            <Link href={MEMBER_PAGE_CONTENT.userMenu.extendUrl} prefetch={false}>
              <RefreshCw />
              {MEMBER_PAGE_CONTENT.userMenu.extendLabel}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/8" />
        <DropdownMenuItem
          className={destructiveDropdownItemClassName}
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          variant="destructive"
        >
          {logout.isPending ? <Spinner className="size-4" /> : <LogOut />}
          {MEMBER_PAGE_CONTENT.userMenu.logoutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
