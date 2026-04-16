import type { ReactNode } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import type { AdminTableColumnOption } from "@/components/shared/data-table/types";
import { Badge } from "@/components/ui/badge";

import { AdminAssetsRowActions } from "./assets-row-actions";

import type { AssetAdminRow } from "@/modules/admin/assets/types";
import type { AdminAssetTableColumnKey } from "../assets-page-types";

export type AdminAssetColumnDefinition = AdminTableColumnOption<AdminAssetTableColumnKey> & {
  key: AdminAssetTableColumnKey;
  label: string;
  renderCell?: (row: AssetAdminRow) => ReactNode;
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

function getStatusBadgeVariant(status: AssetAdminRow["status"]): "secondary" | "outline" | "destructive" {
  if (status === "available") {
    return "secondary";
  }

  if (status === "assigned") {
    return "outline";
  }

  return "destructive";
}

export const ADMIN_ASSET_TABLE_COLUMNS: AdminAssetColumnDefinition[] = [
  {
    key: "platform",
    label: "Platform",
    renderCell: (row) => <span className="font-medium capitalize">{row.platform}</span>,
  },
  {
    key: "expiresAt",
    label: "Expires At",
    renderCell: (row) => <span>{formatDateTime(row.expiresAt)}</span>,
  },
  {
    key: "note",
    label: "Note",
    renderCell: (row) => (
      <span className="block max-w-64 truncate" title={row.note ?? "Not set"}>
        {row.note ?? "-"}
      </span>
    ),
  },
  {
    key: "assetType",
    label: "Asset Type",
    renderCell: (row) => <Badge variant="outline">{row.assetType}</Badge>,
  },
  {
    key: "status",
    label: "Status",
    renderCell: (row) => <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>,
  },
  {
    key: "totalUsed",
    label: "Total Used",
    renderCell: (row) => <span>{row.totalUsed}</span>,
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

export function createAdminAssetTableColumns({
  onEditAsset,
  onOpenDetails,
}: {
  onEditAsset: (assetId: string) => void;
  onOpenDetails: (assetId: string) => void;
}): ColumnDef<AssetAdminRow>[] {
  return ADMIN_ASSET_TABLE_COLUMNS.map((column) => {
    if (column.key === "actions") {
      return {
        id: column.key,
        header: column.label,
        enableHiding: false,
        cell: ({ row }) => (
          <AdminAssetsRowActions row={row.original} onEditAsset={onEditAsset} onOpenDetails={onOpenDetails} />
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
