import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarToneClass } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

import { AdminTransactionsRowActions } from "./transactions-row-actions";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import type { AdminTransactionRow } from "@/modules/admin/userlogs/types";
import type { AdminUserLogsTransactionsColumnKey } from "../userlogs-page-types";

export type AdminTransactionsColumnDefinition = AdminTableColumnOption<AdminUserLogsTransactionsColumnKey> & {
  key: AdminUserLogsTransactionsColumnKey;
  label: string;
  renderCell?: (row: AdminTransactionRow) => ReactNode;
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
  return `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

function getStatusVariant(status: AdminTransactionRow["status"]): "secondary" | "outline" | "destructive" {
  if (status === "success") {
    return "secondary";
  }

  if (status === "pending") {
    return "outline";
  }

  return "destructive";
}

function getSourceLabel(source: AdminTransactionRow["source"]) {
  if (source === "payment_qris") {
    return "QRIS Payment";
  }

  if (source === "payment_dummy") {
    return "Dummy Payment";
  }

  if (source === "cdkey") {
    return "CD Key";
  }

  return "Admin Manual";
}

export const ADMIN_TRANSACTIONS_COLUMNS: AdminTransactionsColumnDefinition[] = [
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
  { key: "packageName", label: "Package", renderCell: (row) => <span className="font-medium">{row.packageName}</span> },
  {
    key: "source",
    label: "Source",
    renderCell: (row) => <Badge variant="outline">{getSourceLabel(row.source)}</Badge>,
  },
  {
    key: "amountRp",
    label: "Amount (Rp)",
    renderCell: (row) => <span className="tabular-nums">{formatCurrency(row.amountRp)}</span>,
  },
  {
    key: "status",
    label: "Status",
    renderCell: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>,
  },
  { key: "createdAt", label: "Created At", renderCell: (row) => <span>{formatDateTime(row.createdAt)}</span> },
  { key: "updatedAt", label: "Updated At", renderCell: (row) => <span>{formatDateTime(row.updatedAt)}</span> },
  {
    key: "actions",
    label: "Actions",
    canHide: false,
  },
];

export function createAdminTransactionsColumns({
  onOpenHistory,
}: {
  onOpenHistory: (transactionId: string) => void;
}): ColumnDef<AdminTransactionRow>[] {
  return ADMIN_TRANSACTIONS_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        enableHiding: false,
        cell: ({ row }) => <AdminTransactionsRowActions onOpenHistory={onOpenHistory} row={row.original} />,
      };
    }

    return {
      id: column.key,
      header: column.label,
      cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
    };
  });
}
