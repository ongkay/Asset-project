import type {
  EditablePackageCheckoutGroup,
  PackageAdminRow,
  PackageEditorData,
  PackageSummary,
  PackageTableResult,
  PackageTableSortKey,
  PackageTableSortOrder,
} from "@/modules/packages/types";

export type PackageAdminLifecycleFilter = "all" | "archived" | "current";

export type PackageTableFilters = {
  checkoutGroup: EditablePackageCheckoutGroup | null;
  lifecycle: PackageAdminLifecycleFilter;
  page: number;
  pageSize: number;
  order: PackageTableSortOrder | null;
  search: string | null;
  sort: PackageTableSortKey | null;
  summary: PackageSummary | null;
};

export type PackageTablePage = PackageTableResult<PackageAdminRow>;

export type PackageEditorPrefill = PackageEditorData;
