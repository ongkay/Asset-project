import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import type { PackageAdminRow } from "@/modules/packages/types";

import type { AdminPackageTableColumnKey } from "./package-types";

export type AdminPackageColumnDefinition = {
  key: AdminPackageTableColumnKey;
  label: string;
  renderCell?: (row: PackageAdminRow) => ReactNode;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string) {
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

const SUMMARY_LABEL_BY_VALUE: Record<PackageAdminRow["summary"], string> = {
  mixed: "Mixed",
  private: "Private",
  share: "Share",
};

export const ADMIN_PACKAGE_TABLE_COLUMNS: AdminPackageColumnDefinition[] = [
  {
    key: "name",
    label: "Package",
    renderCell: (row) => (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{row.name}</span>
        <span className="text-xs text-muted-foreground">{row.code}</span>
      </div>
    ),
  },
  {
    key: "summary",
    label: "Summary",
    renderCell: (row) => (
      <Badge variant="outline" className="capitalize">
        {SUMMARY_LABEL_BY_VALUE[row.summary]}
      </Badge>
    ),
  },
  {
    key: "amountRp",
    label: "Amount",
    renderCell: (row) => <span>{formatRupiah(row.amountRp)}</span>,
  },
  {
    key: "durationDays",
    label: "Duration",
    renderCell: (row) => <span>{row.durationDays} days</span>,
  },
  {
    key: "totalUsed",
    label: "Active Uses",
    renderCell: (row) => <span>{row.totalUsed}</span>,
  },
  {
    key: "status",
    label: "Status",
    renderCell: (row) => (
      <Badge variant={row.isActive ? "secondary" : "outline"}>{row.isActive ? "Active" : "Inactive"}</Badge>
    ),
  },
  {
    key: "updatedAt",
    label: "Updated",
    renderCell: (row) => <span>{formatDateTime(row.updatedAt)}</span>,
  },
  {
    key: "actions",
    label: "Actions",
  },
];
