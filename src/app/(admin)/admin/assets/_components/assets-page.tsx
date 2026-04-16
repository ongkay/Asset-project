"use client";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { AssetDetailDialog } from "./asset-detail-dialog/asset-detail-dialog";
import { AssetFormDialog } from "./asset-form-dialog/asset-form-dialog";
import {
  fetchAssetEditorData,
  fetchAssetTablePage,
  getAssetEditorQueryKey,
  getAssetTableQueryKey,
} from "./assets-query";
import { AdminAssetsTable } from "./assets-table/assets-table";
import { AdminAssetsToolbar } from "./assets-table/assets-toolbar";
import { useAssetsTableState } from "./use-assets-table-state";

import type { AssetEditorData } from "@/modules/admin/assets/types";
import type { AdminAssetPageProps } from "./assets-page-types";

function getAssetPageStats(input: {
  totalCount: number;
  availableCount: number;
  assignedCount: number;
  disabledCount: number;
}) {
  return {
    totalAssets: input.totalCount,
    availableAssets: input.availableCount,
    assignedAssets: input.assignedCount,
    disabledAssets: input.disabledCount,
  };
}

type FormDialogState =
  | { mode: "create"; open: true }
  | { mode: "edit"; open: true; assetId: string }
  | { mode: null; open: false };

type DetailDialogState = { open: true; assetId: string } | { open: false; assetId: null };

export function AdminAssetsPage({
  tablePage: initialTablePage,
  tableError,
  filters,
  initialEditorPrefillById,
}: AdminAssetPageProps) {
  const queryClient = useQueryClient();
  const [formDialogState, setFormDialogState] = useState<FormDialogState>({ mode: null, open: false });
  const [detailDialogState, setDetailDialogState] = useState<DetailDialogState>({ open: false, assetId: null });
  const [editorPrefillById, setEditorPrefillById] = useState<Record<string, AssetEditorData>>(initialEditorPrefillById);

  const tableState = useAssetsTableState(filters);

  const isInitialQueryFilters =
    tableState.tableFilters.page === filters.page &&
    tableState.tableFilters.pageSize === filters.pageSize &&
    tableState.tableFilters.search === filters.search &&
    tableState.tableFilters.assetType === filters.assetType &&
    tableState.tableFilters.status === filters.status &&
    tableState.tableFilters.expiresFrom === filters.expiresFrom &&
    tableState.tableFilters.expiresTo === filters.expiresTo;

  const assetTableQuery = useQuery({
    queryKey: getAssetTableQueryKey(tableState.tableFilters),
    queryFn: () => fetchAssetTablePage(tableState.tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const tablePage = assetTableQuery.data ?? initialTablePage;
  const queryError = assetTableQuery.error instanceof Error ? assetTableQuery.error.message : null;
  const tableErrorMessage = queryError ?? tableError;

  const detailAssetId = detailDialogState.open ? detailDialogState.assetId : null;
  const detailQuery = useQuery({
    queryKey: detailAssetId ? getAssetEditorQueryKey(detailAssetId) : [...getAssetEditorQueryKey("empty"), "disabled"],
    queryFn: () => fetchAssetEditorData(detailAssetId as string),
    enabled: Boolean(detailAssetId),
  });

  const pageStats = getAssetPageStats({
    totalCount: tablePage.totalCount,
    availableCount: tablePage.items.filter((row) => row.status === "available").length,
    assignedCount: tablePage.items.filter((row) => row.status === "assigned").length,
    disabledCount: tablePage.items.filter((row) => row.status === "disabled").length,
  });

  async function handleOpenEditAsset(assetId: string) {
    let prefill = editorPrefillById[assetId] ?? null;

    if (!prefill) {
      prefill = await queryClient.fetchQuery({
        queryKey: getAssetEditorQueryKey(assetId),
        queryFn: () => fetchAssetEditorData(assetId),
      });

      setEditorPrefillById((currentMap) => ({
        ...currentMap,
        [assetId]: prefill,
      }));
    }

    if (!prefill) {
      return;
    }

    setDetailDialogState({ open: false, assetId: null });
    setFormDialogState({ mode: "edit", open: true, assetId });
  }

  return (
    <>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Assets</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.totalAssets}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Available on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.availableAssets}</CardTitle>
              <Badge variant="secondary">
                <HardDrive />
                Available
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Assigned on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.assignedAssets}</CardTitle>
              <Badge variant="outline">
                <Users />
                Assigned
              </Badge>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Disabled on Current Page</CardDescription>
              <CardTitle className="font-semibold text-2xl tabular-nums">{pageStats.disabledAssets}</CardTitle>
              <Badge variant="destructive">Disabled</Badge>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-border/60 py-4 shadow-xs">
          <CardContent className="flex flex-col gap-5 px-4 lg:px-6">
            <AdminAssetsToolbar
              searchValue={tableState.searchInput}
              assetTypeValue={tableState.assetTypeFilter}
              statusValue={tableState.statusFilter}
              expiresRange={tableState.expiresRange}
              onSearchChange={tableState.setSearchInput}
              onAssetTypeChange={tableState.setAssetTypeFilter}
              onStatusChange={tableState.setStatusFilter}
              onExpiresRangeChange={tableState.setExpiresRange}
              onCreateAsset={() => setFormDialogState({ mode: "create", open: true })}
              visibleColumns={tableState.visibleColumns}
              onToggleColumn={tableState.handleToggleColumn}
            />

            <AdminAssetsTable
              tablePage={tablePage}
              tableError={tableErrorMessage}
              visibleColumns={tableState.visibleColumns}
              isFetching={assetTableQuery.isFetching}
              isLoading={assetTableQuery.isLoading && !assetTableQuery.data}
              onPageChange={tableState.handlePageChange}
              onPageSizeChange={tableState.handlePageSizeChange}
              onOpenDetails={(assetId) => {
                setDetailDialogState({ open: true, assetId });
              }}
            />
          </CardContent>
        </Card>
      </div>

      <AssetDetailDialog
        open={detailDialogState.open}
        asset={detailQuery.data ?? null}
        loading={detailQuery.isLoading}
        errorMessage={detailQuery.error instanceof Error ? detailQuery.error.message : null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailDialogState({ open: false, assetId: null });
          }
        }}
        onEditAsset={(assetId) => {
          void handleOpenEditAsset(assetId);
        }}
      />

      <AssetFormDialog
        dialogState={formDialogState}
        prefillById={editorPrefillById}
        onOpenChange={(open) => {
          if (!open) {
            setFormDialogState({ mode: null, open: false });
          }
        }}
        onSaved={() => {
          setEditorPrefillById({});
        }}
      />
    </>
  );
}
