"use client";

import {
  getAdminExtensionTrackPageAction,
  getAdminLoginHistoryPageAction,
  getAdminTransactionDetailAction,
  getAdminTransactionsPageAction,
} from "@/modules/admin/userlogs/actions";

import type {
  AdminExtensionTrackFilters,
  AdminLoginHistoryFilters,
  AdminTransactionDetail,
  AdminTransactionsFilters,
} from "@/modules/admin/userlogs/types";

export const ADMIN_USERLOGS_QUERY_KEY = ["admin-userlogs"] as const;

function getUserLogsActionMessage(result: {
  data?: { message?: string; ok?: boolean };
  validationErrors?: { formErrors?: string[] };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.data?.message ?? null;
}

export async function fetchAdminLoginHistoryPage(input: AdminLoginHistoryFilters) {
  const result = await getAdminLoginHistoryPageAction(input);

  if (result?.data?.ok) {
    return result.data.page;
  }

  throw new Error(getUserLogsActionMessage(result ?? {}) ?? "Failed to load login history.");
}

export async function fetchAdminExtensionTrackPage(input: AdminExtensionTrackFilters) {
  const result = await getAdminExtensionTrackPageAction(input);

  if (result?.data?.ok) {
    return result.data.page;
  }

  throw new Error(getUserLogsActionMessage(result ?? {}) ?? "Failed to load extension track.");
}

export async function fetchAdminTransactionsPage(input: AdminTransactionsFilters) {
  const result = await getAdminTransactionsPageAction(input);

  if (result?.data?.ok) {
    return result.data.page;
  }

  throw new Error(getUserLogsActionMessage(result ?? {}) ?? "Failed to load transactions.");
}

export async function fetchAdminTransactionDetail(transactionId: string): Promise<AdminTransactionDetail> {
  const result = await getAdminTransactionDetailAction({ transactionId });

  if (result?.data?.ok) {
    return result.data.detail;
  }

  throw new Error(getUserLogsActionMessage(result ?? {}) ?? "Failed to load transaction detail.");
}

export function getAdminLoginHistoryQueryKey(filters: AdminLoginHistoryFilters) {
  return [...ADMIN_USERLOGS_QUERY_KEY, "login", filters] as const;
}

export function getAdminExtensionTrackQueryKey(filters: AdminExtensionTrackFilters) {
  return [...ADMIN_USERLOGS_QUERY_KEY, "extension", filters] as const;
}

export function getAdminTransactionsQueryKey(filters: AdminTransactionsFilters) {
  return [...ADMIN_USERLOGS_QUERY_KEY, "transactions", filters] as const;
}

export function getAdminTransactionDetailQueryKey(transactionId: string) {
  return [...ADMIN_USERLOGS_QUERY_KEY, "transaction-detail", transactionId] as const;
}
