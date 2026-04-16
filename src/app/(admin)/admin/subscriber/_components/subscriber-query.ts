"use client";

import {
  getSubscriberActivationDraftAction,
  getSubscriberEditorDataAction,
  getSubscriberTablePageAction,
  searchSubscriberUsersAction,
} from "@/modules/admin/subscriptions/actions";

import type {
  SubscriberActivationDraft,
  SubscriberEditorData,
  SubscriberTableFilters,
} from "@/modules/admin/subscriptions/types";

export const ADMIN_SUBSCRIBER_QUERY_KEY = ["admin-subscriber"] as const;

function getActionMessage(result: { data?: { message?: string }; validationErrors?: { formErrors?: string[] } }) {
  return result.validationErrors?.formErrors?.[0] ?? result.data?.message ?? null;
}

export async function fetchSubscriberTablePage(input: SubscriberTableFilters) {
  const result = await getSubscriberTablePageAction(input);

  if (result?.data?.ok) {
    return result.data.tablePage;
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to load subscriber table.");
}

export async function fetchSubscriberEditorData(input: {
  userId?: string;
  subscriptionId?: string;
}): Promise<SubscriberEditorData> {
  const result = await getSubscriberEditorDataAction(input);

  if (result?.data?.ok) {
    return result.data.editorData;
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to load subscriber editor data.");
}

export async function fetchSubscriberUsers(input: { query: string; page: number; pageSize: number }) {
  const result = await searchSubscriberUsersAction(input);

  if (result?.data?.ok) {
    return {
      users: result.data.users,
      totalCount: result.data.totalCount,
    };
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to search subscriber users.");
}

export async function fetchSubscriberActivationDraft(input: {
  userId: string;
  packageId: string;
  subscriptionId: string | null;
}): Promise<SubscriberActivationDraft> {
  const result = await getSubscriberActivationDraftAction(input);

  if (result?.data?.ok) {
    return result.data.draft;
  }

  throw new Error(getActionMessage(result ?? {}) ?? "Failed to load activation draft.");
}

export function getSubscriberTableQueryKey(filters: SubscriberTableFilters) {
  return [
    ...ADMIN_SUBSCRIBER_QUERY_KEY,
    {
      search: filters.search,
      assetType: filters.assetType,
      status: filters.status,
      expiresFrom: filters.expiresFrom,
      expiresTo: filters.expiresTo,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  ] as const;
}

export function getSubscriberEditorQueryKey(userId: string | null, subscriptionId: string | null) {
  return [...ADMIN_SUBSCRIBER_QUERY_KEY, "editor", userId, subscriptionId] as const;
}

export function getSubscriberUsersQueryKey(query: string, page: number, pageSize: number) {
  return [...ADMIN_SUBSCRIBER_QUERY_KEY, "users", query, page, pageSize] as const;
}

export function getSubscriberActivationDraftQueryKey(userId: string, packageId: string, subscriptionId: string | null) {
  return [...ADMIN_SUBSCRIBER_QUERY_KEY, "draft", userId, packageId, subscriptionId] as const;
}
