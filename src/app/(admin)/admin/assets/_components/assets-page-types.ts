import type { AdminTableDateRangeValue } from "@/components/shared/table-filters/date-range-filter";
import type { AssetEditorData, AssetTableFilters, AssetTableResult } from "@/modules/admin/assets/types";
import type { AssetStatus, AssetType } from "@/modules/assets/types";

export const ASSET_TABLE_COLUMN_KEYS = [
  "platform",
  "expiresAt",
  "note",
  "assetType",
  "status",
  "totalUsed",
  "createdAt",
  "updatedAt",
  "actions",
] as const;

export type AdminAssetTableColumnKey = (typeof ASSET_TABLE_COLUMN_KEYS)[number];

export type AdminAssetColumnVisibility = Record<AdminAssetTableColumnKey, boolean>;

export type AdminAssetDetailDialogState =
  | {
      open: true;
      assetId: string;
    }
  | {
      open: false;
      assetId: null;
    };

export type AdminAssetPageProps = {
  filters: AssetTableFilters;
  tablePage: AssetTableResult;
  tableError: string | null;
  initialEditorPrefillById: Record<string, AssetEditorData>;
};

export type AdminAssetFilterState = {
  search: string;
  assetType: AssetType | null;
  status: AssetStatus | null;
  expiresRange: AdminTableDateRangeValue;
};
