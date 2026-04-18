"use client";

import {
  getCdKeyDetailSnapshotAction,
  getCdKeyTablePageAction,
  listIssuablePackagesAction,
} from "@/modules/admin/cdkeys/actions";

import type { CdKeyTableFilters } from "@/modules/admin/cdkeys/types";

export const ADMIN_CDKEY_QUERY_KEY = ["admin-cdkey"] as const;

function getActionMessage(result: { data?: { message?: string }; validationErrors?: { formErrors?: string[] } }) {
  return result.validationErrors?.formErrors?.[0] ?? result.data?.message ?? null;
}

export async function fetchCdKeyTablePage(input: CdKeyTableFilters) {
  const result = await getCdKeyTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to load CD key table.");
}

export async function fetchCdKeyDetailSnapshot(input: { id: string }) {
  const result = await getCdKeyDetailSnapshotAction(input);

  if (result?.data?.ok) {
    return result.data.detail;
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to load CD key detail.");
}

export async function fetchIssuablePackages() {
  const result = await listIssuablePackagesAction({});

  if (result?.data?.ok) {
    return result.data.packages;
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to load issuable packages.");
}

export function getCdKeyTableQueryKey(filters: CdKeyTableFilters) {
  return [
    ...ADMIN_CDKEY_QUERY_KEY,
    {
      search: filters.search,
      status: filters.status,
      packageId: filters.packageId,
      packageSummary: filters.packageSummary,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  ] as const;
}

export function getCdKeyDetailQueryKey(cdKeyId: string) {
  return [...ADMIN_CDKEY_QUERY_KEY, "detail", cdKeyId] as const;
}

export function getIssuablePackagesQueryKey() {
  return [...ADMIN_CDKEY_QUERY_KEY, "issuable-packages"] as const;
}
