"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { AdminUserRow } from "@/modules/admin/users/types";
import type { AdminUsersRowActionHandlers } from "./users-types";

type AdminUsersRowActionsProps = AdminUsersRowActionHandlers & {
  row: AdminUserRow;
};

export function AdminUsersRowActions({
  row,
  onChangePassword,
  onEditUser,
  onOpenDetails,
  onToggleBan,
}: AdminUsersRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`Open actions for user ${row.username}`} size="icon-sm" type="button" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onOpenDetails(row.userId);
            }}
          >
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onEditUser(row.userId);
            }}
          >
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onChangePassword(row.userId);
            }}
          >
            Change Password
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onToggleBan(row.userId);
          }}
        >
          {row.isBanned ? "Unban User" : "Ban User"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
