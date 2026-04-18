"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";

import { UserBanDialog } from "./user-ban-dialog/user-ban-dialog";
import { UserChangePasswordDialog } from "./user-change-password-dialog/user-change-password-dialog";
import { UserDetailDialog } from "./user-detail-dialog/user-detail-dialog";
import { UserFormDialog } from "./user-form-dialog/user-form-dialog";
import { fetchAdminUsersTablePage, getAdminUsersTableQueryKey } from "./users-query";
import {
  closeAdminUsersDialogState,
  openAdminUsersCreateDialogState,
  openAdminUsersDetailDialogState,
  openAdminUsersPasswordDialogState,
  openAdminUsersToggleBanDialogState,
} from "./users-dialog-state";
import { useUsersTableState } from "./use-users-table-state";
import { AdminUsersTable } from "./users-table/users-table";
import { AdminUsersToolbar } from "./users-table/users-toolbar";

import type { AdminUsersPageProps } from "./users-page-types";
import type { AdminUserRow } from "@/modules/admin/users/types";

export function resolveAdminUsersTableError(
  queryError: string | null,
  tableError: string | null,
  hasResolvedTableData: boolean,
) {
  return queryError ?? (hasResolvedTableData ? null : tableError);
}

function findUserRowById(rows: AdminUserRow[], userId: string) {
  return rows.find((row) => row.userId === userId) ?? null;
}

export function AdminUsersPage({
  currentAdminUserId,
  filters,
  tableError,
  tablePage: initialTablePage,
}: AdminUsersPageProps) {
  const tableState = useUsersTableState(filters);
  const [dialogState, setDialogState] = useState(closeAdminUsersDialogState);

  const isInitialQueryFilters =
    tableState.tableFilters.page === filters.page &&
    tableState.tableFilters.pageSize === filters.pageSize &&
    tableState.tableFilters.search === filters.search &&
    tableState.tableFilters.role === filters.role &&
    tableState.tableFilters.subscriptionStatus === filters.subscriptionStatus &&
    tableState.tableFilters.packageSummary === filters.packageSummary;

  const usersTableQuery = useQuery({
    queryKey: getAdminUsersTableQueryKey(tableState.tableFilters),
    queryFn: () => fetchAdminUsersTablePage(tableState.tableFilters),
    initialData: !tableError && isInitialQueryFilters ? initialTablePage : undefined,
    placeholderData: (previousData) => previousData,
  });

  const resolvedTablePage = usersTableQuery.data ?? initialTablePage;
  const queryError = usersTableQuery.error instanceof Error ? usersTableQuery.error.message : null;
  const resolvedTableError = resolveAdminUsersTableError(queryError, tableError, Boolean(usersTableQuery.data));

  const activeBanRow =
    dialogState.open && dialogState.mode === "toggle-ban"
      ? (findUserRowById(resolvedTablePage.items, dialogState.userId) ?? {
          isBanned: dialogState.currentIsBanned,
          userId: dialogState.userId,
          username: dialogState.username,
        })
      : null;

  return (
    <>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <Card className="border-border/60 py-4 shadow-xs">
          <CardContent className="flex flex-col gap-5 px-4 lg:px-6">
            <AdminUsersToolbar
              packageSummaryValue={tableState.packageSummaryFilter}
              roleValue={tableState.roleFilter}
              searchValue={tableState.searchInput}
              subscriptionStatusValue={tableState.subscriptionStatusFilter}
              visibleColumns={tableState.visibleColumns}
              onCreateUser={() => setDialogState(openAdminUsersCreateDialogState())}
              onPackageSummaryChange={tableState.setPackageSummaryFilter}
              onRoleChange={tableState.setRoleFilter}
              onSearchChange={tableState.setSearchInput}
              onSubscriptionStatusChange={tableState.setSubscriptionStatusFilter}
              onToggleColumn={tableState.handleToggleColumn}
            />

            <AdminUsersTable
              isFetching={usersTableQuery.isFetching}
              isLoading={usersTableQuery.isLoading && !usersTableQuery.data}
              tableError={resolvedTableError}
              tablePage={resolvedTablePage}
              visibleColumns={tableState.visibleColumns}
              onChangePassword={(userId) => setDialogState(openAdminUsersPasswordDialogState(userId))}
              onEditUser={(userId) => setDialogState(openAdminUsersDetailDialogState(userId, "edit"))}
              onOpenDetails={(userId) => setDialogState(openAdminUsersDetailDialogState(userId, "view"))}
              onPageChange={tableState.handlePageChange}
              onPageSizeChange={tableState.handlePageSizeChange}
              onToggleBan={(userId) => {
                const userRow = findUserRowById(resolvedTablePage.items, userId);

                if (!userRow) {
                  return;
                }

                setDialogState(
                  openAdminUsersToggleBanDialogState({
                    isBanned: userRow.isBanned,
                    userId: userRow.userId,
                    username: userRow.username,
                  }),
                );
              }}
            />
          </CardContent>
        </Card>
      </div>

      <UserFormDialog
        open={dialogState.open && dialogState.mode === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(closeAdminUsersDialogState());
          }
        }}
      />

      <UserDetailDialog
        dialogState={dialogState.mode === "detail" ? dialogState : closeAdminUsersDialogState()}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(closeAdminUsersDialogState());
          }
        }}
      />

      <UserChangePasswordDialog
        open={dialogState.open && dialogState.mode === "change-password"}
        userId={dialogState.open && dialogState.mode === "change-password" ? dialogState.userId : null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(closeAdminUsersDialogState());
          }
        }}
      />

      <UserBanDialog
        currentAdminUserId={currentAdminUserId}
        currentIsBanned={activeBanRow?.isBanned ?? false}
        open={dialogState.open && dialogState.mode === "toggle-ban"}
        userId={dialogState.open && dialogState.mode === "toggle-ban" ? dialogState.userId : null}
        username={activeBanRow?.username ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(closeAdminUsersDialogState());
          }
        }}
      />
    </>
  );
}
