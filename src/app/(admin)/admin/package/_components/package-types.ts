import type { PackageEditorPrefill, PackageTableFilters, PackageTablePage } from "@/modules/admin/packages/types";

export const ADMIN_PACKAGE_QUERY_KEY = ["admin-packages"] as const;

export const PACKAGE_TABLE_COLUMN_KEYS = [
  "name",
  "summary",
  "amountRp",
  "durationDays",
  "totalUsed",
  "status",
  "updatedAt",
  "actions",
] as const;

export type AdminPackageTableColumnKey = (typeof PACKAGE_TABLE_COLUMN_KEYS)[number];

export type AdminPackageColumnVisibility = Record<AdminPackageTableColumnKey, boolean>;

export type AdminPackageDialogState =
  | {
      mode: "create";
      open: true;
    }
  | {
      mode: "edit";
      open: true;
      packageId: string;
    }
  | {
      mode: null;
      open: false;
    };

export type AdminPackagePageProps = {
  initialEditorPrefillById: Record<string, PackageEditorPrefill>;
  filters: PackageTableFilters;
  tableError: string | null;
  tablePage: PackageTablePage;
};
