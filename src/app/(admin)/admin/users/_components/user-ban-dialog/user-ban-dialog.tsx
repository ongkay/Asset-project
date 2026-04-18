"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toggleUserBanAction } from "@/modules/users/actions";

import {
  getAdminUsersActionMessage,
  isAdminUsersTableQueryKey,
  shouldAllowAdminUsersDialogOpenChange,
} from "../users-action-feedback";
import { getAdminUserDetailQueryKey } from "../users-query";

type UserBanDialogProps = {
  currentAdminUserId: string;
  currentIsBanned: boolean;
  open: boolean;
  userId: string | null;
  username: string | null;
  onOpenChange: (open: boolean) => void;
};

export function isSelfBanAttempt(currentAdminUserId: string, targetUserId: string | null, nextIsBanned: boolean) {
  return nextIsBanned && targetUserId === currentAdminUserId;
}

export function UserBanDialog({
  currentAdminUserId,
  currentIsBanned,
  open,
  userId,
  username,
  onOpenChange,
}: UserBanDialogProps) {
  const queryClient = useQueryClient();
  const toggleBanMutation = useAction(toggleUserBanAction);
  const nextIsBanned = !currentIsBanned;

  function handleOpenChange(nextOpen: boolean) {
    if (!shouldAllowAdminUsersDialogOpenChange(nextOpen, toggleBanMutation.isPending)) {
      return;
    }

    onOpenChange(nextOpen);
  }

  async function handleToggleBan() {
    if (!userId) {
      return;
    }

    if (isSelfBanAttempt(currentAdminUserId, userId, nextIsBanned)) {
      toast.error("You cannot ban your own admin account.");
      return;
    }

    const result = await toggleBanMutation.executeAsync({
      banReason: nextIsBanned ? "Banned by admin." : null,
      nextIsBanned,
      userId,
    });

    if (!result.data?.ok) {
      toast.error(getAdminUsersActionMessage(result ?? {}) ?? "Failed to update user ban state.");
      return;
    }

    toast.success(nextIsBanned ? "User banned." : "User unbanned.");
    await Promise.all([
      queryClient.invalidateQueries({ predicate: (query) => isAdminUsersTableQueryKey(query.queryKey) }),
      queryClient.invalidateQueries({ queryKey: getAdminUserDetailQueryKey(userId) }),
    ]);
    handleOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{nextIsBanned ? "Ban this user account?" : "Restore this user account?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {nextIsBanned
              ? `${username ?? "This user"} will be blocked from signing in until an admin restores access.`
              : `${username ?? "This user"} will be allowed to sign in again after the account is restored.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={toggleBanMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={toggleBanMutation.isPending || !userId}
            onClick={(event) => {
              event.preventDefault();
              void handleToggleBan();
            }}
            variant={nextIsBanned ? "destructive" : "default"}
          >
            {nextIsBanned ? "Ban User" : "Unban User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
