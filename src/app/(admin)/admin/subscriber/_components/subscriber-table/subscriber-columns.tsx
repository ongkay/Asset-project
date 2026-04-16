import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import { AdminSubscriberRowActions } from "./subscriber-row-actions";

import type { SubscriberAdminRow } from "@/modules/admin/subscriptions/types";
import type { AdminSubscriberTableColumnKey } from "../subscriber-page-types";

export type AdminSubscriberColumnDefinition = AdminTableColumnOption<AdminSubscriberTableColumnKey> & {
  key: AdminSubscriberTableColumnKey;
  label: string;
  renderCell?: (row: SubscriberAdminRow) => ReactNode;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function getStatusBadgeVariant(
  status: SubscriberAdminRow["subscriptionStatus"],
): "secondary" | "outline" | "destructive" {
  if (status === "active") {
    return "secondary";
  }

  if (status === "processed") {
    return "outline";
  }

  return "destructive";
}

export const ADMIN_SUBSCRIBER_TABLE_COLUMNS: AdminSubscriberColumnDefinition[] = [
  {
    key: "user",
    label: "User",
    renderCell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9 rounded-full">
          <AvatarImage src={row.avatarUrl ?? undefined} alt={row.username} />
          <AvatarFallback className={`${row.avatarUrl ? "" : getAvatarToneClass(row.userId)} rounded-full`}>
            {getInitials(row.username)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{row.username}</p>
          <p className="truncate text-muted-foreground text-xs">{row.email}</p>
          <p className="truncate text-muted-foreground text-xs">{row.userId}</p>
        </div>
      </div>
    ),
  },
  {
    key: "subscriptionStatus",
    label: "Subscription Status",
    renderCell: (row) => (
      <Badge variant={getStatusBadgeVariant(row.subscriptionStatus)}>{row.subscriptionStatus}</Badge>
    ),
  },
  {
    key: "startAt",
    label: "Start Date",
    renderCell: (row) => <span>{formatDateTime(row.startAt)}</span>,
  },
  {
    key: "expiresAt",
    label: "Expires At",
    renderCell: (row) => <span>{formatDateTime(row.expiresAt)}</span>,
  },
  {
    key: "totalSpentRp",
    label: "Total Spent (Rp)",
    renderCell: (row) => <span className="tabular-nums">Rp {formatCurrency(row.totalSpentRp)}</span>,
  },
  {
    key: "packageName",
    label: "Package",
    renderCell: (row) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium">{row.packageName}</span>
        <div className="flex flex-wrap gap-1">
          {row.accessKeys.map((accessKey) => (
            <Badge key={accessKey} variant="outline">
              {accessKey}
            </Badge>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "actions",
    label: "Actions",
    canHide: false,
  },
];

export function createAdminSubscriberTableColumns({
  onEditRow,
  onCancelRow,
}: {
  onEditRow: (row: SubscriberAdminRow) => void;
  onCancelRow: (row: SubscriberAdminRow) => void;
}): ColumnDef<SubscriberAdminRow>[] {
  return ADMIN_SUBSCRIBER_TABLE_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        enableHiding: false,
        cell: ({ row }) => (
          <AdminSubscriberRowActions row={row.original} onEditRow={onEditRow} onCancelRow={onCancelRow} />
        ),
      };
    }

    return {
      id: column.key,
      header: column.label,
      cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
    };
  });
}
