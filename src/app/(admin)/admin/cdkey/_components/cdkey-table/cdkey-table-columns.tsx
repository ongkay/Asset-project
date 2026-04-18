import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import { AdminCdKeyTableRowActions } from "./cdkey-table-row-actions";

import type { CdKeyAdminRow } from "@/modules/admin/cdkeys/types";
import type { AdminCdKeyTableColumnKey } from "../cdkey-page-types";

export type AdminCdKeyColumnDefinition = AdminTableColumnOption<AdminCdKeyTableColumnKey> & {
  key: AdminCdKeyTableColumnKey;
  label: string;
  renderCell?: (row: CdKeyAdminRow) => ReactNode;
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

function formatIdentityUser(user: CdKeyAdminRow["createdBy"] | CdKeyAdminRow["usedBy"], emptyLabel: string) {
  if (!user) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 rounded-full">
        <AvatarImage alt={user.username} src={user.avatarUrl ?? undefined} />
        <AvatarFallback className={`${user.avatarUrl ? "" : getAvatarToneClass(user.userId)} rounded-full`}>
          {getInitials(user.username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{user.username}</p>
        <p className="truncate text-muted-foreground text-xs">{user.email}</p>
      </div>
    </div>
  );
}

export const ADMIN_CDKEY_TABLE_COLUMNS: AdminCdKeyColumnDefinition[] = [
  {
    key: "code",
    label: "Code",
    renderCell: (row) => <span className="font-mono text-xs sm:text-sm">{row.code}</span>,
  },
  {
    key: "package",
    label: "Package",
    renderCell: (row) => (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{row.packageName ?? "-"}</span>
        <div className="flex items-center gap-2">
          <Badge className="capitalize" variant="outline">
            {row.packageSummary}
          </Badge>
          {!row.isActive ? <Badge variant="outline">Disabled</Badge> : null}
        </div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    renderCell: (row) => <Badge variant={row.status === "used" ? "outline" : "secondary"}>{row.status}</Badge>,
  },
  {
    key: "usedBy",
    label: "Used By",
    renderCell: (row) => formatIdentityUser(row.usedBy, "Unused"),
  },
  {
    key: "createdBy",
    label: "Created By",
    renderCell: (row) => formatIdentityUser(row.createdBy, "-"),
  },
  {
    key: "createdAt",
    label: "Created At",
    renderCell: (row) => <span>{formatDateTime(row.createdAt)}</span>,
  },
  {
    key: "updatedAt",
    label: "Updated At",
    renderCell: (row) => <span>{formatDateTime(row.updatedAt)}</span>,
  },
  {
    key: "actions",
    label: "Actions",
    canHide: false,
  },
];

export function createAdminCdKeyTableColumns({
  onOpenDetails,
}: {
  onOpenDetails: (row: CdKeyAdminRow) => void;
}): ColumnDef<CdKeyAdminRow>[] {
  return ADMIN_CDKEY_TABLE_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        enableHiding: false,
        cell: ({ row }) => <AdminCdKeyTableRowActions row={row.original} onOpenDetails={onOpenDetails} />,
      };
    }

    return {
      id: column.key,
      header: column.label,
      cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
    };
  });
}
