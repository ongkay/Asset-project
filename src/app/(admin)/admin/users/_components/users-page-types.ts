import type { AdminUsersTableFilters, AdminUsersTableResult } from "@/modules/admin/users/types";

export const ADMIN_USERS_TABLE_COLUMN_KEYS = [
  "userId",
  "user",
  "publicId",
  "role",
  "subscriptionStatus",
  "expiresAt",
  "packageSummary",
  "banned",
  "updatedAt",
  "createdAt",
  "actions",
] as const;

export type AdminUsersTableColumnKey = (typeof ADMIN_USERS_TABLE_COLUMN_KEYS)[number];

export type AdminUsersColumnVisibility = Record<AdminUsersTableColumnKey, boolean>;

export type AdminUsersPageProps = {
  currentAdminUserId: string;
  filters: AdminUsersTableFilters;
  tablePage: AdminUsersTableResult;
  tableError: string | null;
};
