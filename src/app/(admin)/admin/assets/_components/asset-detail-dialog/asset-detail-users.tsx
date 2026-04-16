"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AssetActiveUserRow } from "@/modules/admin/assets/types";

type AssetDetailUsersProps = {
  users: AssetActiveUserRow[];
};

export function AssetDetailUsers({ users }: AssetDetailUsersProps) {
  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">No active users.</p>;
  }

  return (
    <div className="grid gap-3">
      {users.map((user) => (
        <div
          className="flex items-start gap-3 rounded-md border p-3"
          key={`${user.userId}:${user.subscriptionId ?? "-"}`}
        >
          <Avatar className="size-9 rounded-full">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
            <AvatarFallback className={`${user.avatarUrl ? "" : getAvatarToneClass(user.userId)} rounded-full`}>
              {getInitials(user.username)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{user.username}</p>
            <p className="truncate text-muted-foreground text-xs">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {user.accessKey ? <Badge variant="outline">{user.accessKey}</Badge> : null}
              {user.subscriptionStatus ? <Badge variant="outline">{user.subscriptionStatus}</Badge> : null}
              {user.assignedAt ? (
                <span className="text-muted-foreground text-xs">Assigned {formatDate(user.assignedAt)}</span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
