"use client";

import { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { PackageCheck, ToggleLeft, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";
import { getPackageEditorDataAction, getPackageTablePageAction } from "@/modules/admin/packages/actions";

import { AdminPackageFormDialog } from "./package-form-dialog";
import { AdminPackageTable } from "./package-table";
import { AdminPackageToolbar } from "./package-toolbar";
import { ADMIN_PACKAGE_QUERY_KEY, PACKAGE_TABLE_COLUMN_KEYS } from "./package-types";

import type {
  AdminPackageColumnVisibility,
  AdminPackageDialogState,
  AdminPackagePageProps,
  AdminPackageTableColumnKey,
} from "./package-types";
import type { PackageSummary, PackageTableSortKey, PackageTableSortOrder } from "@/modules/packages/types";
import type { PackageEditorPrefill } from "@/modules/admin/packages/types";
import type { PackageTablePage } from "@/modules/admin/packages/types";

const COLUMN_VISIBILITY_STORAGE_KEY = "admin.package.columns.v1";

const DEFAULT_COLUMN_VISIBILITY: AdminPackageColumnVisibility = {
  actions: true,
  amountRp: true,
  durationDays: true,
  name: true,
  status: true,
  summary: true,
  totalUsed: true,
  updatedAt: true,
};

function parseColumnVisibility(value: string | null): AdminPackageColumnVisibility {
  if (!value) {
    return DEFAULT_COLUMN_VISIBILITY;
  }

  try {
    const parsedValue = JSON.parse(value) as Partial<Record<AdminPackageTableColumnKey, unknown>>;

    const normalizedVisibility = PACKAGE_TABLE_COLUMN_KEYS.reduce<AdminPackageColumnVisibility>(
      (accumulator, columnKey) => {
        accumulator[columnKey] =
          typeof parsedValue[columnKey] === "boolean"
            ? (parsedValue[columnKey] as boolean)
            : DEFAULT_COLUMN_VISIBILITY[columnKey];
        return accumulator;
      },
      { ...DEFAULT_COLUMN_VISIBILITY },
    );

    normalizedVisibility.actions = true;
    return normalizedVisibility;
  } catch {
    return DEFAULT_COLUMN_VISIBILITY;
  }
}

function useDebouncedValue<TValue>(value: TValue, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}

async function fetchPackageTablePage(input: {
  order: PackageTableSortOrder | null;
  page: number;
  pageSize: number;
  search: string | null;
  sort: PackageTableSortKey | null;
  summary: PackageSummary | null;
}) {
  const result = await getPackageTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  const validationError = result?.validationErrors?.formErrors?.[0];
  const message = validationError ?? result?.data?.message ?? "Failed to load package table.";

  throw new Error(message);
}

function getPackagePageStats(tablePage: PackageTablePage) {
  const activePackages = tablePage.items.filter((packageRow) => packageRow.isActive).length;
  const currentPageUses = tablePage.items.reduce((totalUses, packageRow) => totalUses + packageRow.totalUsed, 0);

  return {
    activePackages,
    currentPageUses,
    inactivePackages: tablePage.items.length - activePackages,
    totalPackages: tablePage.totalCount,
  };
}

export function AdminPackagePage({
  tablePage: initialTablePage,
  tableError,
  filters,
  initialEditorPrefillById,
}: AdminPackagePageProps) {
  const pathname = usePathname();

  const editRequestCounterRef = useRef(0);
  const [dialogState, setDialogState] = useState<AdminPackageDialogState>({ mode: null, open: false });
  const [editorPrefillById, setEditorPrefillById] =
    useState<Record<string, PackageEditorPrefill>>(initialEditorPrefillById);
  const [tableFilters, setTableFilters] = useState(filters);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [summaryFilter, setSummaryFilter] = useState<PackageSummary | null>(filters.summary);
  const [visibleColumns, setVisibleColumns] = useState<AdminPackageColumnVisibility>(DEFAULT_COLUMN_VISIBILITY);

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const isInitialQueryFilters =
    tableFilters.page === filters.page &&
    tableFilters.pageSize === filters.pageSize &&
    tableFilters.order === filters.order &&
    tableFilters.search === filters.search &&
    tableFilters.sort === filters.sort &&
    tableFilters.summary === filters.summary;
  const packageTableQuery = useQuery({
    queryKey: [
      ...ADMIN_PACKAGE_QUERY_KEY,
      {
        page: tableFilters.page,
        pageSize: tableFilters.pageSize,
        order: tableFilters.order,
        search: tableFilters.search,
        sort: tableFilters.sort,
        summary: tableFilters.summary,
      },
    ],
    queryFn: () => fetchPackageTablePage(tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const tablePage = packageTableQuery.data ?? initialTablePage;
  const queryError = packageTableQuery.error instanceof Error ? packageTableQuery.error.message : null;
  const tableErrorMessage = queryError ?? tableError;
  const pageStats = getPackagePageStats(tablePage);

  useEffect(() => {
    setVisibleColumns(parseColumnVisibility(getLocalStorageValue(COLUMN_VISIBILITY_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : null;

    setTableFilters((currentFilters) => {
      if (currentFilters.search === nextSearch && currentFilters.summary === summaryFilter) {
        return currentFilters;
      }

      return {
        ...currentFilters,
        page: 1,
        search: nextSearch,
        summary: summaryFilter,
      };
    });
  }, [debouncedSearch, summaryFilter]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (tableFilters.search) {
      nextSearchParams.set("search", tableFilters.search);
    }

    if (tableFilters.summary) {
      nextSearchParams.set("summary", tableFilters.summary);
    }

    if (tableFilters.page > 1) {
      nextSearchParams.set("page", String(tableFilters.page));
    }

    if (tableFilters.pageSize !== 10) {
      nextSearchParams.set("pageSize", String(tableFilters.pageSize));
    }

    if (tableFilters.sort && tableFilters.order) {
      nextSearchParams.set("sort", tableFilters.sort);
      nextSearchParams.set("order", tableFilters.order);
    }

    const nextQueryString = nextSearchParams.toString();
    const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [pathname, tableFilters]);

  function handlePageChange(page: number) {
    setTableFilters((currentFilters) => ({
      ...currentFilters,
      page: Math.max(1, page),
    }));
  }

  function handlePageSizeChange(pageSize: number) {
    setTableFilters((currentFilters) => ({
      ...currentFilters,
      page: 1,
      pageSize,
    }));
  }

  function handleSortChange(sort: PackageTableSortKey) {
    setTableFilters((currentFilters) => {
      if (currentFilters.sort !== sort) {
        return {
          ...currentFilters,
          order: "asc",
          page: 1,
          sort,
        };
      }

      if (currentFilters.order === "asc") {
        return {
          ...currentFilters,
          order: "desc",
          page: 1,
        };
      }

      return {
        ...currentFilters,
        order: null,
        page: 1,
        sort: null,
      };
    });
  }

  useEffect(() => {
    setEditorPrefillById(initialEditorPrefillById);
  }, [initialEditorPrefillById]);

  async function handleOpenEditPackage(packageId: string) {
    const requestId = editRequestCounterRef.current + 1;
    editRequestCounterRef.current = requestId;

    const existingPrefill = editorPrefillById[packageId];

    if (existingPrefill) {
      setDialogState({ mode: "edit", open: true, packageId });
      return;
    }

    const result = await getPackageEditorDataAction({ id: packageId });
    const actionData = result?.data;

    if (!actionData?.ok) {
      return;
    }

    if (requestId !== editRequestCounterRef.current) {
      return;
    }

    const fetchedPrefill = actionData.prefill;

    if (!fetchedPrefill) {
      return;
    }

    setEditorPrefillById((currentPrefillById) => ({
      ...currentPrefillById,
      [packageId]: fetchedPrefill,
    }));
    setDialogState({ mode: "edit", open: true, packageId });
  }

  function handleToggleColumn(columnKey: AdminPackageTableColumnKey, nextVisible: boolean) {
    if (columnKey === "actions") {
      return;
    }

    const nextVisibility = {
      ...visibleColumns,
      [columnKey]: nextVisible,
      actions: true,
    };

    setVisibleColumns(nextVisibility);
    setLocalStorageValue(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(nextVisibility));
  }

  return (
    <>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Packages</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
                {pageStats.totalPackages}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Active on This Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
                {pageStats.activePackages}
              </CardTitle>
              <Badge variant="outline">
                <PackageCheck />
                Active
              </Badge>
            </CardHeader>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Inactive on This Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
                {pageStats.inactivePackages}
              </CardTitle>
              <Badge variant="outline">
                <ToggleLeft />
                Paused
              </Badge>
            </CardHeader>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Active Uses on This Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums @[250px]/card:text-3xl">
                {pageStats.currentPageUses}
              </CardTitle>
              <Badge variant="outline">
                <Users />
                Uses
              </Badge>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-border/60 py-4 shadow-xs">
          <CardContent className="flex flex-col gap-5 px-4 lg:px-6">
            <AdminPackageToolbar
              onCreatePackage={() => setDialogState({ mode: "create", open: true })}
              onSearchChange={setSearchInput}
              onSummaryChange={setSummaryFilter}
              onToggleColumn={handleToggleColumn}
              searchValue={searchInput}
              summaryValue={summaryFilter}
              visibleColumns={visibleColumns}
            />

            <AdminPackageTable
              isFetching={packageTableQuery.isFetching}
              isLoading={packageTableQuery.isLoading && !packageTableQuery.data}
              onEditPackage={(packageId) => {
                void handleOpenEditPackage(packageId);
              }}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSortChange={handleSortChange}
              sortOrder={tableFilters.order}
              sortValue={tableFilters.sort}
              tableError={tableErrorMessage}
              tablePage={tablePage}
              visibleColumns={visibleColumns}
            />
          </CardContent>
        </Card>
      </div>

      <AdminPackageFormDialog
        dialogState={dialogState}
        onPackageSaved={() => setEditorPrefillById({})}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState({ mode: null, open: false });
          }
        }}
        prefillById={editorPrefillById}
      />
    </>
  );
}
