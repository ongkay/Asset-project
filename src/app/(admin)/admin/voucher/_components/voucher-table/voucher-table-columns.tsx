import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import { Badge } from "@/components/ui/badge";

import type { VoucherAdminRow } from "@/modules/admin/vouchers/types";

import { AdminVoucherRowActions } from "./voucher-table-row-actions";

import type { AdminVoucherTableColumnKey } from "../voucher-page-types";

export type AdminVoucherColumnDefinition = AdminTableColumnOption<AdminVoucherTableColumnKey> & {
  key: AdminVoucherTableColumnKey;
  label: string;
  renderCell?: (row: VoucherAdminRow) => ReactNode;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const STATUS_LABEL_BY_VALUE: Record<VoucherAdminRow["status"], string> = {
  active: "Active",
  exhausted: "Exhausted",
  expired: "Expired",
  inactive: "Inactive",
};

export const ADMIN_VOUCHER_TABLE_COLUMNS: AdminVoucherColumnDefinition[] = [
  {
    key: "code",
    label: "Code",
    renderCell: (row) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium tracking-[0.04em] uppercase">{row.code}</span>
        <span className="text-muted-foreground text-xs">Updated {formatDateTime(row.updatedAt)}</span>
      </div>
    ),
  },
  {
    key: "discountPercent",
    label: "Discount",
    renderCell: (row) => <span className="font-medium">{row.discountPercent}%</span>,
  },
  {
    key: "scope",
    label: "Scope",
    renderCell: (row) => (
      <Badge className="capitalize" variant={row.scopeType === "global" ? "secondary" : "outline"}>
        {row.scopeType}
      </Badge>
    ),
  },
  {
    key: "package",
    label: "Package",
    renderCell: (row) => (
      <div className="flex min-w-0 max-w-56 flex-col gap-1">
        <span className="truncate font-medium">{row.packageName ?? "All checkout packages"}</span>
        <span className="truncate text-muted-foreground text-xs">
          {row.scopeType === "global" ? "Global voucher" : row.packageId}
        </span>
      </div>
    ),
  },
  {
    key: "usage",
    label: "Usage",
    renderCell: (row) => (
      <div className="flex flex-col gap-1">
        <span>
          {row.usedCount}/{row.maxUses ?? "Unlimited"}
        </span>
        <span className="text-muted-foreground text-xs">
          {row.remainingUses === null ? "No usage cap" : `${row.remainingUses} remaining`}
        </span>
      </div>
    ),
  },
  {
    key: "expiresAt",
    label: "Expires",
    renderCell: (row) => <span>{formatDateTime(row.expiresAt)}</span>,
  },
  {
    key: "status",
    label: "Status",
    renderCell: (row) => (
      <Badge className="capitalize" variant={row.status === "active" ? "secondary" : "outline"}>
        {STATUS_LABEL_BY_VALUE[row.status]}
      </Badge>
    ),
  },
  {
    key: "updatedAt",
    label: "Updated",
    renderCell: (row) => <span>{formatDateTime(row.updatedAt)}</span>,
  },
  {
    canHide: false,
    key: "actions",
    label: "Actions",
  },
];

export function createAdminVoucherTableColumns({
  onEditVoucher,
}: {
  onEditVoucher: (row: VoucherAdminRow) => void;
}): ColumnDef<VoucherAdminRow>[] {
  return ADMIN_VOUCHER_TABLE_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        cell: ({ row }) => <AdminVoucherRowActions onEditVoucher={onEditVoucher} row={row.original} />,
        enableHiding: false,
      };
    }

    return {
      id: column.key,
      header: column.label,
      cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
    };
  });
}
