import type {
  PackageAdminRow,
  PackageEditorData,
  PackageSummary,
  PackageTableResult,
  PackageTableSortKey,
  PackageTableSortOrder,
} from "@/modules/packages/types";

export type PackageTableFilters = {
  page: number;
  pageSize: number;
  order: PackageTableSortOrder | null;
  search: string | null;
  sort: PackageTableSortKey | null;
  summary: PackageSummary | null;
};

export type PackageTablePage = PackageTableResult<PackageAdminRow>;

export type PackageEditorPrefill = PackageEditorData;
