"use client";

import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { PackageCheck, ToggleLeft, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPackageEditorDataAction } from "@/modules/admin/packages/actions";

import { AdminPackageFormDialog } from "./package-form-dialog/package-form-dialog";
import { fetchPackageTablePage, getPackageTableQueryKey } from "./package-query";
import { AdminPackageTable } from "./package-table/package-table";
import { AdminPackageToolbar } from "./package-table/package-table-toolbar";
import { usePackageTableState } from "./use-package-table-state";

import type { AdminPackageDialogState, AdminPackagePageProps } from "./package-page-types";
import type { PackageEditorPrefill } from "@/modules/admin/packages/types";
import type { PackageTablePage } from "@/modules/admin/packages/types";

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
  const editRequestCounterRef = useRef(0);
  const [dialogState, setDialogState] = useState<AdminPackageDialogState>({ mode: null, open: false });
  const [editorPrefillById, setEditorPrefillById] =
    useState<Record<string, PackageEditorPrefill>>(initialEditorPrefillById);
  const tableState = usePackageTableState(filters);

  const isInitialQueryFilters =
    tableState.tableFilters.page === filters.page &&
    tableState.tableFilters.pageSize === filters.pageSize &&
    tableState.tableFilters.order === filters.order &&
    tableState.tableFilters.search === filters.search &&
    tableState.tableFilters.sort === filters.sort &&
    tableState.tableFilters.summary === filters.summary;
  const packageTableQuery = useQuery({
    queryKey: getPackageTableQueryKey(tableState.tableFilters),
    queryFn: () => fetchPackageTablePage(tableState.tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const tablePage = packageTableQuery.data ?? initialTablePage;
  const queryError = packageTableQuery.error instanceof Error ? packageTableQuery.error.message : null;
  const tableErrorMessage = queryError ?? tableError;
  const pageStats = getPackagePageStats(tablePage);

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
              onSearchChange={tableState.setSearchInput}
              onSummaryChange={tableState.setSummaryFilter}
              onToggleColumn={tableState.handleToggleColumn}
              searchValue={tableState.searchInput}
              summaryValue={tableState.summaryFilter}
              visibleColumns={tableState.visibleColumns}
            />

            <AdminPackageTable
              isFetching={packageTableQuery.isFetching}
              isLoading={packageTableQuery.isLoading && !packageTableQuery.data}
              onEditPackage={(packageId) => {
                void handleOpenEditPackage(packageId);
              }}
              onPageChange={tableState.handlePageChange}
              onPageSizeChange={tableState.handlePageSizeChange}
              onSortChange={tableState.handleSortChange}
              sortOrder={tableState.tableFilters.order}
              sortValue={tableState.tableFilters.sort}
              tableError={tableErrorMessage}
              tablePage={tablePage}
              visibleColumns={tableState.visibleColumns}
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
