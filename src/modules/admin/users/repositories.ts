import "server-only";

import { z } from "zod";

import { createInsForgeServerDatabase } from "@/lib/insforge/database";
import { PACKAGE_ACCESS_KEYS, type PackageAccessKey } from "@/modules/packages/types";

type AdminUserRole = "admin" | "member";

const packageAccessKeySchema = z.enum(PACKAGE_ACCESS_KEYS, {
  error: "Access key is invalid.",
});

const adminUserProfileRepositoryRowSchema = z.object({
  user_id: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  avatar_url: z.string().nullable(),
  public_id: z.string().min(1),
  role: z.enum(["admin", "member"]),
  is_banned: z.boolean(),
  ban_reason: z.string().nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const adminUserSubscriptionRepositoryRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  package_id: z.string().min(1),
  package_name: z.string().min(1),
  access_keys_json: z.array(packageAccessKeySchema).min(1, "Access key is invalid."),
  status: z.enum(["active", "processed", "expired", "canceled"]),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const adminUserActiveAssetRepositoryRowSchema = z.object({
  asset_id: z.string().min(1),
  subscription_id: z.string().min(1),
  access_key: z.string().min(1),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
  note: z.string().nullable(),
  expires_at: z.string().min(1),
  subscription_status: z.enum(["active", "processed", "expired", "canceled"]),
  subscription_end_at: z.string().min(1),
});

const adminUserTransactionRepositoryRowSchema = z.object({
  transaction_id: z.string().min(1),
  user_id: z.string().min(1),
  package_id: z.string().min(1),
  package_name: z.string().min(1),
  source: z.enum(["payment_dummy", "cdkey", "admin_manual"]),
  status: z.enum(["pending", "success", "failed", "canceled"]),
  amount_rp: z.number().int(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  paid_at: z.string().nullable(),
});

const adminUserLoginLogRepositoryRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().nullable(),
  email: z.string().email(),
  is_success: z.boolean(),
  failure_reason: z.string().nullable(),
  ip_address: z.string().min(1),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  created_at: z.string().min(1),
});

const adminUserExtensionTrackRepositoryRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  extension_id: z.string().min(1),
  device_id: z.string().min(1),
  extension_version: z.string().min(1),
  ip_address: z.string().min(1),
  city: z.string().nullable(),
  country: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  first_seen_at: z.string().min(1),
  last_seen_at: z.string().min(1),
});

export type AdminUserProfileRepositoryRow = z.infer<typeof adminUserProfileRepositoryRowSchema>;
export type AdminUserSubscriptionRepositoryRow = Omit<
  z.infer<typeof adminUserSubscriptionRepositoryRowSchema>,
  "access_keys_json"
> & {
  access_keys_json: PackageAccessKey[];
};
export type AdminUserActiveAssetRepositoryRow = z.infer<typeof adminUserActiveAssetRepositoryRowSchema>;
export type AdminUserTransactionRepositoryRow = z.infer<typeof adminUserTransactionRepositoryRowSchema>;
export type AdminUserLoginLogRepositoryRow = z.infer<typeof adminUserLoginLogRepositoryRowSchema>;
export type AdminUserExtensionTrackRepositoryRow = z.infer<typeof adminUserExtensionTrackRepositoryRowSchema>;

const ADMIN_USER_PROFILE_SELECT =
  "user_id, email, username, avatar_url, public_id, role, is_banned, ban_reason, created_at, updated_at";
const ADMIN_USER_SUBSCRIPTION_SELECT =
  "id, user_id, package_id, package_name, access_keys_json, status, start_at, end_at, created_at, updated_at";

function createAdminUsersRepositoryDatabase() {
  return createInsForgeServerDatabase();
}

function escapePostgrestSearchValue(value: string) {
  return value.replaceAll(",", "\\,");
}

function parseArrayRows<TRow>(rows: unknown, schema: z.ZodType<TRow>) {
  if (!Array.isArray(rows)) {
    return [] as TRow[];
  }

  return z.array(schema).parse(rows);
}

function applyRoleFilter<TQuery extends { eq: (column: string, value: string) => TQuery }>(
  query: TQuery,
  role: AdminUserRole | null,
) {
  if (!role) {
    return query;
  }

  return query.eq("role", role);
}

function applySearchFilter<TQuery extends { or: (filter: string) => TQuery }>(query: TQuery, search: string | null) {
  if (!search) {
    return query;
  }

  const escapedSearch = escapePostgrestSearchValue(search);
  return query.or(
    `user_id.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%,username.ilike.%${escapedSearch}%,public_id.ilike.%${escapedSearch}%`,
  );
}

export async function listAdminUserTableProfilesPage(input: {
  page: number;
  pageSize: number;
  role: AdminUserRole | null;
  search: string | null;
}) {
  const database = createAdminUsersRepositoryDatabase();
  const startIndex = (input.page - 1) * input.pageSize;
  const endIndex = startIndex + input.pageSize - 1;
  const baseQuery = database
    .from("profiles")
    .select(ADMIN_USER_PROFILE_SELECT, { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("user_id", { ascending: false })
    .range(startIndex, endIndex);
  const query = applySearchFilter(applyRoleFilter(baseQuery, input.role), input.search);
  const { count, data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    profiles: parseArrayRows(data, adminUserProfileRepositoryRowSchema),
    totalCount: count ?? 0,
  };
}

export async function listAdminUserTableProfilesBatch(input: {
  limit: number;
  offset: number;
  role: AdminUserRole | null;
  search: string | null;
}) {
  const database = createAdminUsersRepositoryDatabase();
  const baseQuery = database
    .from("profiles")
    .select(ADMIN_USER_PROFILE_SELECT)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("user_id", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);
  const query = applySearchFilter(applyRoleFilter(baseQuery, input.role), input.search);
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return parseArrayRows(data, adminUserProfileRepositoryRowSchema);
}

export async function listAdminUserSubscriptionsByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [] satisfies AdminUserSubscriptionRepositoryRow[];
  }

  const database = createAdminUsersRepositoryDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .select(ADMIN_USER_SUBSCRIPTION_SELECT)
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return parseArrayRows(data, adminUserSubscriptionRepositoryRowSchema);
}

export async function readAdminUserProfileByUserId(userId: string) {
  const database = createAdminUsersRepositoryDatabase();
  const { data, error } = await database
    .from("profiles")
    .select(ADMIN_USER_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? adminUserProfileRepositoryRowSchema.parse(data) : null;
}

export async function listAdminUserSubscriptionsByUserId(userId: string) {
  return listAdminUserSubscriptionsByUserIds([userId]);
}

export async function listAdminUserActiveAssetsByUserId(userId: string) {
  const database = createAdminUsersRepositoryDatabase();
  const { data, error } = await database
    .from("v_current_asset_access")
    .select(
      "asset_id, subscription_id, access_key, platform, asset_type, note, expires_at, subscription_status, subscription_end_at",
    )
    .eq("user_id", userId)
    .order("expires_at", { ascending: true })
    .order("access_key", { ascending: true });

  if (error) {
    throw error;
  }

  return parseArrayRows(data, adminUserActiveAssetRepositoryRowSchema);
}

export async function listAdminUserTransactionsByUserId(userId: string) {
  const database = createAdminUsersRepositoryDatabase();
  const { data, error } = await database
    .from("v_transaction_list")
    .select(
      "transaction_id, user_id, package_id, package_name, source, status, amount_rp, created_at, updated_at, paid_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return parseArrayRows(data, adminUserTransactionRepositoryRowSchema);
}

export async function listAdminUserLoginLogsByUserId(userId: string) {
  const database = createAdminUsersRepositoryDatabase();
  const { data, error } = await database
    .from("login_logs")
    .select("id, user_id, email, is_success, failure_reason, ip_address, browser, os, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return parseArrayRows(data, adminUserLoginLogRepositoryRowSchema);
}

export async function listAdminUserExtensionTracksByUserId(userId: string) {
  const database = createAdminUsersRepositoryDatabase();
  const { data, error } = await database
    .from("extension_tracks")
    .select(
      "id, user_id, extension_id, device_id, extension_version, ip_address, city, country, browser, os, first_seen_at, last_seen_at",
    )
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return parseArrayRows(data, adminUserExtensionTrackRepositoryRowSchema);
}
