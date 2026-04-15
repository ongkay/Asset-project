import type { ReactNode } from "react";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { PackageAdminRow, PackageTableSortKey, PackageTableSortOrder } from "@/modules/packages/types";

import { AdminPackageRowActions } from "./package-table-row-actions";

import type { AdminPackageTableColumnKey } from "../package-page-types";

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

function SortableHeader({
  children,
  sortKey,
  sortOrder,
  sortValue,
  onSortChange,
}: {
  children: string;
  sortKey: PackageTableSortKey;
  sortOrder: PackageTableSortOrder | null;
  sortValue: PackageTableSortKey | null;
  onSortChange: (sortKey: PackageTableSortKey) => void;
}) {
  const isActive = sortValue === sortKey;
  const SortIcon = !isActive ? ArrowUpDownIcon : sortOrder === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Button
      className="-ml-2 h-8 px-2 text-muted-foreground data-[active=true]:text-foreground"
      data-active={isActive ? "true" : undefined}
      onClick={() => onSortChange(sortKey)}
      size="sm"
      type="button"
      variant="ghost"
    >
      {children}
      <SortIcon data-icon="inline-end" />
    </Button>
  );
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
      <div className="flex min-w-0 max-w-72 flex-col gap-1">
        <span className="truncate font-medium">{row.name}</span>
        <span className="truncate text-muted-foreground text-xs" title={row.accessKeys.join(", ")}>
          {row.accessKeys.join(", ")}
        </span>
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

export function createAdminPackageTableColumns({
  onEditPackage,
  onSortChange,
  sortOrder,
  sortValue,
}: {
  onEditPackage: (packageId: string) => void;
  onSortChange: (sortKey: PackageTableSortKey) => void;
  sortOrder: PackageTableSortOrder | null;
  sortValue: PackageTableSortKey | null;
}): ColumnDef<PackageAdminRow>[] {
  return ADMIN_PACKAGE_TABLE_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        cell: ({ row }) => <AdminPackageRowActions onEditPackage={onEditPackage} row={row.original} />,
        enableHiding: false,
      };
    }

    if (column.key === "status") {
      return {
        id: column.key,
        header: () => (
          <SortableHeader onSortChange={onSortChange} sortKey="status" sortOrder={sortOrder} sortValue={sortValue}>
            {column.label}
          </SortableHeader>
        ),
        cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
      };
    }

    if (column.key === "updatedAt") {
      return {
        id: column.key,
        header: () => (
          <SortableHeader onSortChange={onSortChange} sortKey="updatedAt" sortOrder={sortOrder} sortValue={sortValue}>
            {column.label}
          </SortableHeader>
        ),
        cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
      };
    }

    return {
      id: column.key,
      header: column.label,
      cell: ({ row }) => column.renderCell?.(row.original) ?? "-",
    };
  });
}
