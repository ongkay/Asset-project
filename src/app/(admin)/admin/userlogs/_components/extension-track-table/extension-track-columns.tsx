import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import type { AdminExtensionTrackRow } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsExtensionColumnKey } from "../userlogs-page-types";

export type AdminExtensionTrackColumnDefinition = AdminTableColumnOption<AdminUserLogsExtensionColumnKey> & {
  key: AdminUserLogsExtensionColumnKey;
  label: string;
  renderCell?: (row: AdminExtensionTrackRow) => ReactNode;
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

export const ADMIN_EXTENSION_TRACK_COLUMNS: AdminExtensionTrackColumnDefinition[] = [
  {
    key: "user",
    label: "User",
    renderCell: (row) => {
      const initials = getInitials(row.user.username);

      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="sm">
            {row.user.avatarUrl ? <AvatarImage alt={row.user.username} src={row.user.avatarUrl} /> : null}
            <AvatarFallback className={getAvatarToneClass(row.user.userId)}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.user.username}</p>
            <p className="truncate text-muted-foreground text-xs">{row.user.email}</p>
          </div>
        </div>
      );
    },
  },
  { key: "ipAddress", label: "IP", renderCell: (row) => <span className="font-mono text-xs">{row.ipAddress}</span> },
  { key: "city", label: "City", renderCell: (row) => renderNullableValue(row.city, "Unknown city") },
  { key: "country", label: "Country", renderCell: (row) => renderNullableValue(row.country, "Unknown country") },
  { key: "browser", label: "Browser", renderCell: (row) => renderNullableValue(row.browser, "Unknown browser") },
  { key: "os", label: "OS", renderCell: (row) => renderNullableValue(row.os, "Unknown OS") },
  { key: "extensionVersion", label: "Extension Version", renderCell: (row) => <span>{row.extensionVersion}</span> },
  {
    key: "deviceId",
    label: "Device ID",
    renderCell: (row) => <span className="font-mono text-xs">{row.deviceId}</span>,
  },
  {
    key: "extensionId",
    label: "Extension ID",
    renderCell: (row) => <span className="font-mono text-xs">{row.extensionId}</span>,
  },
  { key: "firstSeenAt", label: "First Seen At", renderCell: (row) => <span>{formatDateTime(row.firstSeenAt)}</span> },
  { key: "lastSeenAt", label: "Last Seen At", renderCell: (row) => <span>{formatDateTime(row.lastSeenAt)}</span> },
];

export function createAdminExtensionTrackColumns(): ColumnDef<AdminExtensionTrackRow>[] {
  return ADMIN_EXTENSION_TRACK_COLUMNS.map((column) => ({
    id: column.key,
    header: column.label,
    cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
  }));
}
