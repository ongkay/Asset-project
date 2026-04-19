import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import type { AdminLoginHistoryRow } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsLoginColumnKey } from "../userlogs-page-types";

export type AdminLoginHistoryColumnDefinition = AdminTableColumnOption<AdminUserLogsLoginColumnKey> & {
  key: AdminUserLogsLoginColumnKey;
  label: string;
  renderCell?: (row: AdminLoginHistoryRow) => ReactNode;
};

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

function renderNullableValue(value: string | null, emptyLabel: string) {
  return value ? value : <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
}

export const ADMIN_LOGIN_HISTORY_COLUMNS: AdminLoginHistoryColumnDefinition[] = [
  {
    key: "user",
    label: "User",
    renderCell: (row) => {
      const avatarSeed = row.user.userId ?? row.user.email;
      const avatarAlt = row.user.username ?? row.user.email;
      const initials = getInitials(row.user.username ?? row.user.email);

      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="sm">
            {row.user.avatarUrl ? <AvatarImage alt={avatarAlt} src={row.user.avatarUrl} /> : null}
            <AvatarFallback className={getAvatarToneClass(avatarSeed)}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.user.username ?? row.user.email}</p>
            <p className="truncate text-muted-foreground text-xs">
              {row.user.isResolved ? row.user.email : "No linked profile available"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    key: "ipAddress",
    label: "IP",
    renderCell: (row) => <span className="font-mono text-xs">{row.ipAddress}</span>,
  },
  {
    key: "browser",
    label: "Browser",
    renderCell: (row) => renderNullableValue(row.browser, "Unknown browser"),
  },
  {
    key: "os",
    label: "OS",
    renderCell: (row) => renderNullableValue(row.os, "Unknown OS"),
  },
  {
    key: "loginTime",
    label: "Login Time",
    renderCell: (row) => <span>{formatDateTime(row.loginTime)}</span>,
  },
  {
    key: "status",
    label: "Status",
    renderCell: (row) => (
      <Badge variant={row.isSuccess ? "secondary" : "destructive"}>{row.isSuccess ? "Success" : "Failed"}</Badge>
    ),
  },
];

export function createAdminLoginHistoryColumns(): ColumnDef<AdminLoginHistoryRow>[] {
  return ADMIN_LOGIN_HISTORY_COLUMNS.map((column) => ({
    id: column.key,
    header: column.label,
    cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
  }));
}
