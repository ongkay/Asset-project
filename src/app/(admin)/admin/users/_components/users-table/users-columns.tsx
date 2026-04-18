import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import { AdminUsersRowActions } from "./users-row-actions";

import type { AdminUserRow } from "@/modules/admin/users/types";
import type { AdminUsersColumnDefinition, AdminUsersRowActionHandlers } from "./users-types";

function formatDateTime(value: string) {
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

function getRoleBadgeVariant(role: AdminUserRow["role"]): "outline" | "secondary" {
  return role === "admin" ? "outline" : "secondary";
}

function getSubscriptionStatusBadgeVariant(
  status: AdminUserRow["subscriptionStatus"],
): "outline" | "secondary" | "destructive" {
  if (status === "active" || status === "processed") {
    return "secondary";
  }

  if (status === "expired") {
    return "outline";
  }

  return "destructive";
}

export const ADMIN_USERS_TABLE_COLUMNS: AdminUsersColumnDefinition[] = [
  {
    key: "userId",
    label: "ID",
    renderCell: (row) => <span className="font-mono text-xs">{row.userId}</span>,
  },
  {
    key: "user",
    label: "User",
    renderCell: (row) => {
      const initials = getInitials(row.username);

      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="sm">
            {row.avatarUrl ? <AvatarImage alt={row.username} src={row.avatarUrl} /> : null}
            <AvatarFallback className={getAvatarToneClass(row.userId)}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.username}</p>
            <p className="truncate text-muted-foreground text-xs">{row.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    key: "publicId",
    label: "Public ID",
    renderCell: (row) => <span className="font-mono text-xs">{row.publicId}</span>,
  },
  {
    key: "role",
    label: "Role",
    renderCell: (row) => <Badge variant={getRoleBadgeVariant(row.role)}>{row.role}</Badge>,
  },
  {
    key: "subscriptionStatus",
    label: "Subscription",
    renderCell: (row) =>
      row.subscriptionStatus ? (
        <Badge variant={getSubscriptionStatusBadgeVariant(row.subscriptionStatus)}>{row.subscriptionStatus}</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      ),
  },
  {
    key: "expiresAt",
    label: "Expires At",
    renderCell: (row) =>
      row.subscriptionEndAt ? (
        <span>{formatDateTime(row.subscriptionEndAt)}</span>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      ),
  },
  {
    key: "packageSummary",
    label: "Package",
    renderCell: (row) => <Badge variant="outline">{row.activePackageSummary}</Badge>,
  },
  {
    key: "banned",
    label: "State",
    renderCell: (row) => (
      <Badge variant={row.isBanned ? "destructive" : "secondary"}>{row.isBanned ? "Banned" : "Active"}</Badge>
    ),
  },
  {
    key: "updatedAt",
    label: "Updated At",
    renderCell: (row) => <span>{formatDateTime(row.updatedAt)}</span>,
  },
  {
    key: "createdAt",
    label: "Created At",
    renderCell: (row) => <span>{formatDateTime(row.createdAt)}</span>,
  },
  {
    key: "actions",
    label: "Actions",
    canHide: false,
  },
];

export function createAdminUsersTableColumns(actionHandlers: AdminUsersRowActionHandlers): ColumnDef<AdminUserRow>[] {
  return ADMIN_USERS_TABLE_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        enableHiding: false,
        cell: ({ row }) => <AdminUsersRowActions row={row.original} {...actionHandlers} />,
      };
    }

    return {
      id: column.key,
      header: column.label,
      cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
    };
  });
}
