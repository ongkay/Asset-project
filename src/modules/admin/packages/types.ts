import type { PackageAdminRow, PackageEditorData, PackageSummary, PackageTableResult } from "@/modules/packages/types";

export type PackageTableFilters = {
  page: number;
  pageSize: number;
  search: string | null;
  summary: PackageSummary | null;
};

export type PackageTablePage = PackageTableResult<PackageAdminRow>;

export type PackageEditorPrefill = PackageEditorData;
