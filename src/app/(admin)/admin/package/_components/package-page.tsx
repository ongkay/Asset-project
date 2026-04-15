"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";
import { getPackageEditorDataAction } from "@/modules/admin/packages/actions";

import { AdminPackageFormDialog } from "./package-form-dialog";
import { AdminPackageTable } from "./package-table";
import { AdminPackageToolbar } from "./package-toolbar";
import { PACKAGE_TABLE_COLUMN_KEYS } from "./package-types";

import type {
  AdminPackageColumnVisibility,
  AdminPackageDialogState,
  AdminPackagePageProps,
  AdminPackageTableColumnKey,
} from "./package-types";
import type { PackageSummary } from "@/modules/packages/types";
import type { PackageEditorPrefill } from "@/modules/admin/packages/types";

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

export function AdminPackagePage({ tablePage, tableError, filters, initialEditorPrefillById }: AdminPackagePageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isRefreshing, startTransition] = useTransition();
  const editRequestCounterRef = useRef(0);
  const [dialogState, setDialogState] = useState<AdminPackageDialogState>({ mode: null, open: false });
  const [editorPrefillById, setEditorPrefillById] =
    useState<Record<string, PackageEditorPrefill>>(initialEditorPrefillById);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [summaryFilter, setSummaryFilter] = useState<PackageSummary | null>(filters.summary);
  const [pageSize, setPageSize] = useState<number>(filters.pageSize);
  const [visibleColumns, setVisibleColumns] = useState<AdminPackageColumnVisibility>(DEFAULT_COLUMN_VISIBILITY);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setVisibleColumns(parseColumnVisibility(getLocalStorageValue(COLUMN_VISIBILITY_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim();
    const currentSearch = filters.search ?? "";

    if (normalizedSearch === currentSearch && summaryFilter === filters.summary && pageSize === filters.pageSize) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (normalizedSearch.length === 0) {
      nextSearchParams.delete("search");
    } else {
      nextSearchParams.set("search", normalizedSearch);
    }

    if (!summaryFilter) {
      nextSearchParams.delete("summary");
    } else {
      nextSearchParams.set("summary", summaryFilter);
    }

    if (pageSize === 10) {
      nextSearchParams.delete("pageSize");
    } else {
      nextSearchParams.set("pageSize", String(pageSize));
    }

    nextSearchParams.set("page", "1");

    startTransition(() => {
      router.replace(`${pathname}?${nextSearchParams.toString()}`);
    });
  }, [
    debouncedSearch,
    filters.pageSize,
    filters.search,
    filters.summary,
    pageSize,
    pathname,
    router,
    searchParams,
    summaryFilter,
  ]);

  const hasAnyTableData = tablePage.items.length > 0;
  const hasError = Boolean(tableError);
  const isTableLoading = isRefreshing && !hasError && !hasAnyTableData;

  const canGoToPage = useMemo(
    () => (page: number) => {
      const nextPage = page < 1 ? 1 : page;
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (nextPage <= 1) {
        nextSearchParams.delete("page");
      } else {
        nextSearchParams.set("page", String(nextPage));
      }

      startTransition(() => {
        router.replace(`${pathname}?${nextSearchParams.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

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
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="space-y-1">
          <CardTitle>Package Management</CardTitle>
          <CardDescription>
            Manage package pricing, access bundles, and activation status with server-side filtered table state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AdminPackageToolbar
            onCreatePackage={() => setDialogState({ mode: "create", open: true })}
            onPageSizeChange={(nextPageSize) => setPageSize(nextPageSize)}
            onSearchChange={setSearchInput}
            onSummaryChange={setSummaryFilter}
            onToggleColumn={handleToggleColumn}
            pageSizeValue={pageSize}
            searchValue={searchInput}
            summaryValue={summaryFilter}
            totalCount={tablePage.totalCount}
            visibleColumns={visibleColumns}
          />

          <AdminPackageTable
            isLoading={isTableLoading}
            onEditPackage={(packageId) => {
              void handleOpenEditPackage(packageId);
            }}
            onPageChange={(page) => canGoToPage(page)}
            tableError={tableError}
            tablePage={tablePage}
            visibleColumns={visibleColumns}
          />
        </CardContent>
      </Card>

      <AdminPackageFormDialog
        dialogState={dialogState}
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
