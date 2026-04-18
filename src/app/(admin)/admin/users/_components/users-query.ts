"use client";

import { getAdminUserDetailAction, getAdminUsersTablePageAction } from "@/modules/admin/users/actions";

import { getAdminUsersActionMessage } from "./users-action-feedback";

import type { AdminUserDetailPayload, AdminUsersTableFilters } from "@/modules/admin/users/types";

export const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

export async function fetchAdminUsersTablePage(input: AdminUsersTableFilters) {
  const result = await getAdminUsersTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  throw new Error(getAdminUsersActionMessage(result ?? {}) ?? "Failed to load users table.");
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetailPayload> {
  const result = await getAdminUserDetailAction({ userId });

  if (result?.data?.ok) {
    return result.data.detail;
  }

  throw new Error(getAdminUsersActionMessage(result ?? {}) ?? "Failed to load user detail.");
}

export function getAdminUsersTableQueryKey(filters: AdminUsersTableFilters) {
  return [
    ...ADMIN_USERS_QUERY_KEY,
    {
      search: filters.search,
      role: filters.role,
      subscriptionStatus: filters.subscriptionStatus,
      packageSummary: filters.packageSummary,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  ] as const;
}

export function getAdminUserDetailQueryKey(userId: string) {
  return [...ADMIN_USERS_QUERY_KEY, "detail", userId] as const;
}
