import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type { AdminExtensionTrackFilters, AdminLoginHistoryFilters, AdminTransactionsFilters } from "./types";

const profileSummaryRepositoryRowSchema = z.object({
  user_id: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  avatar_url: z.string().nullable(),
  public_id: z.string().min(1),
});

const loginHistoryRepositoryRowSchema = z.object({
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

const extensionTrackRepositoryRowSchema = z.object({
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

const transactionRepositoryRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  subscription_id: z.string().nullable(),
  package_id: z.string().min(1),
  package_name: z.string().min(1),
  source: z.enum(["payment_dummy", "payment_qris", "cdkey", "admin_manual"]),
  status: z.enum(["pending", "success", "failed", "canceled"]),
  amount_rp: z.number().int(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  paid_at: z.string().nullable(),
});

const assignmentSnapshotRepositoryRowSchema = z.object({
  id: z.string().min(1),
  subscription_id: z.string().min(1),
  asset_id: z.string().nullable(),
  original_asset_id: z.string().min(1),
  access_key: z.string().min(1),
  asset_platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
  asset_note: z.string().nullable(),
  asset_expires_at: z.string().min(1),
  assigned_at: z.string().min(1),
  revoked_at: z.string().nullable(),
  revoke_reason: z.string().nullable(),
  asset_deleted_at: z.string().nullable(),
});

export type AdminProfileSummaryRepositoryRow = z.infer<typeof profileSummaryRepositoryRowSchema>;
export type AdminLoginHistoryBaseRepositoryRow = z.infer<typeof loginHistoryRepositoryRowSchema>;
export type AdminExtensionTrackBaseRepositoryRow = z.infer<typeof extensionTrackRepositoryRowSchema>;
export type AdminTransactionBaseRepositoryRow = z.infer<typeof transactionRepositoryRowSchema>;
export type AdminAssignmentSnapshotRepositoryRow = z.infer<typeof assignmentSnapshotRepositoryRowSchema>;

export type AdminLoginHistoryRepositoryRow = AdminLoginHistoryBaseRepositoryRow & {
  avatar_url: string | null;
  profile_email: string | null;
  public_id: string | null;
  username: string | null;
};

export type AdminExtensionTrackRepositoryRow = AdminExtensionTrackBaseRepositoryRow & AdminProfileSummaryRepositoryRow;

export type AdminTransactionRepositoryRow = AdminTransactionBaseRepositoryRow & AdminProfileSummaryRepositoryRow;

function createAdminUserLogsRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

function escapePostgrestSearchValue(value: string) {
  return value.replace(/([\\,%_()])/g, "\\$1");
}

function isUuidSearchValue(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseArrayRows<TRow>(rows: unknown, schema: z.ZodType<TRow>) {
  if (!Array.isArray(rows)) {
    return [] as TRow[];
  }

  return z.array(schema).parse(rows);
}

function toDateStartIso(dateOnly: string) {
  return `${dateOnly}T00:00:00.000Z`;
}

function toDateEndIso(dateOnly: string) {
  return `${dateOnly}T23:59:59.999Z`;
}

function buildUserIdOrFilters(userIds: string[], rawSearch: string) {
  const orFilters: string[] = [];

  if (isUuidSearchValue(rawSearch)) {
    orFilters.push(`user_id.eq.${rawSearch}`);
  }

  if (userIds.length > 0) {
    orFilters.push(`user_id.in.(${userIds.join(",")})`);
  }

  return orFilters;
}

async function listMatchingProfilesBySearch(search: string | null) {
  if (!search) {
    return [] satisfies AdminProfileSummaryRepositoryRow[];
  }

  const database = createAdminUserLogsRepositoryDatabase();
  const escapedSearch = escapePostgrestSearchValue(search);
  const orFilters = [
    `email.ilike.%${escapedSearch}%`,
    `username.ilike.%${escapedSearch}%`,
    `public_id.ilike.%${escapedSearch}%`,
  ];

  if (isUuidSearchValue(search)) {
    orFilters.push(`user_id.eq.${search}`);
  }

  const { data, error } = await database
    .from("profiles")
    .select("user_id, email, username, avatar_url, public_id")
    .or(orFilters.join(","));

  if (error) {
    throw error;
  }

  return parseArrayRows(data, profileSummaryRepositoryRowSchema);
}

async function listProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [] satisfies AdminProfileSummaryRepositoryRow[];
  }

  const database = createAdminUserLogsRepositoryDatabase();
  const { data, error } = await database
    .from("profiles")
    .select("user_id, email, username, avatar_url, public_id")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return parseArrayRows(data, profileSummaryRepositoryRowSchema);
}

function buildProfileMap(rows: AdminProfileSummaryRepositoryRow[]) {
  return rows.reduce<Map<string, AdminProfileSummaryRepositoryRow>>((result, row) => {
    result.set(row.user_id, row);
    return result;
  }, new Map());
}

function getDistinctTextValues(rows: Array<{ browser?: string | null; os?: string | null }>, key: "browser" | "os") {
  return [...new Set(rows.map((row) => row[key]?.trim()).filter((value) => Boolean(value)) as string[])].sort((a, b) =>
    a.localeCompare(b),
  );
}

function applyDateRangeFilters<
  TQuery extends { gte: (column: string, value: string) => TQuery; lt: (column: string, value: string) => TQuery },
>(query: TQuery, columnName: string, dateFrom: string | null, dateTo: string | null) {
  let nextQuery = query;

  if (dateFrom) {
    nextQuery = nextQuery.gte(columnName, toDateStartIso(dateFrom));
  }

  if (dateTo) {
    nextQuery = nextQuery.lt(columnName, toDateEndIso(dateTo));
  }

  return nextQuery;
}

export async function listAdminLoginHistoryPageRows(input: AdminLoginHistoryFilters) {
  const database = createAdminUserLogsRepositoryDatabase();
  const pageStart = (input.page - 1) * input.pageSize;
  const pageEnd = pageStart + input.pageSize - 1;
  const matchingProfiles = await listMatchingProfilesBySearch(input.search);
  const searchValue = input.search ? escapePostgrestSearchValue(input.search) : null;
  const baseQuery = database
    .from("login_logs")
    .select("id, user_id, email, is_success, failure_reason, ip_address, browser, os, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pageStart, pageEnd);

  let query = applyDateRangeFilters(baseQuery, "created_at", input.dateFrom, input.dateTo);

  if (input.os) {
    query = query.eq("os", input.os);
  }

  if (searchValue) {
    const orFilters = [
      `email.ilike.%${searchValue}%`,
      ...buildUserIdOrFilters(
        matchingProfiles.map((row) => row.user_id),
        input.search!,
      ),
    ];
    query = query.or(orFilters.join(","));
  }

  const { count, data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(data, loginHistoryRepositoryRowSchema);
  const profilesByUserId = buildProfileMap(
    await listProfilesByUserIds(rows.map((row) => row.user_id).filter((userId): userId is string => Boolean(userId))),
  );

  return {
    rows: rows.map((row) => {
      const profile = row.user_id ? (profilesByUserId.get(row.user_id) ?? null) : null;

      return {
        ...row,
        avatar_url: profile?.avatar_url ?? null,
        profile_email: profile?.email ?? null,
        public_id: profile?.public_id ?? null,
        username: profile?.username ?? null,
      } satisfies AdminLoginHistoryRepositoryRow;
    }),
    totalCount: count ?? 0,
  };
}

export async function listAdminLoginHistoryOsValues() {
  const database = createAdminUserLogsRepositoryDatabase();
  const { data, error } = await database.from("login_logs").select("os");

  if (error) {
    throw error;
  }

  return getDistinctTextValues(parseArrayRows(data, z.object({ os: z.string().nullable() })), "os");
}

export async function listAdminExtensionTrackPageRows(input: AdminExtensionTrackFilters) {
  const database = createAdminUserLogsRepositoryDatabase();
  const pageStart = (input.page - 1) * input.pageSize;
  const pageEnd = pageStart + input.pageSize - 1;
  const matchingProfiles = await listMatchingProfilesBySearch(input.search);
  const searchValue = input.search ? escapePostgrestSearchValue(input.search) : null;
  const baseQuery = database
    .from("extension_tracks")
    .select(
      "id, user_id, extension_id, device_id, extension_version, ip_address, city, country, browser, os, first_seen_at, last_seen_at",
      { count: "exact" },
    )
    .order("last_seen_at", { ascending: false })
    .order("first_seen_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pageStart, pageEnd);

  let query = applyDateRangeFilters(baseQuery, "last_seen_at", input.dateFrom, input.dateTo);

  if (input.browser) {
    query = query.eq("browser", input.browser);
  }

  if (input.os) {
    query = query.eq("os", input.os);
  }

  if (searchValue) {
    const orFilters = [
      `extension_id.ilike.%${searchValue}%`,
      `device_id.ilike.%${searchValue}%`,
      `ip_address.ilike.%${searchValue}%`,
      ...buildUserIdOrFilters(
        matchingProfiles.map((row) => row.user_id),
        input.search!,
      ),
    ];
    query = query.or(orFilters.join(","));
  }

  const { count, data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(data, extensionTrackRepositoryRowSchema);
  const profilesByUserId = buildProfileMap(await listProfilesByUserIds(rows.map((row) => row.user_id)));

  return {
    rows: rows
      .map((row) => {
        const profile = profilesByUserId.get(row.user_id);

        if (!profile) {
          return null;
        }

        return {
          ...row,
          ...profile,
        } satisfies AdminExtensionTrackRepositoryRow;
      })
      .filter((row): row is AdminExtensionTrackRepositoryRow => Boolean(row)),
    totalCount: count ?? 0,
  };
}

export async function listAdminExtensionTrackFilterValues() {
  const database = createAdminUserLogsRepositoryDatabase();
  const { data, error } = await database.from("extension_tracks").select("browser, os");

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(data, z.object({ browser: z.string().nullable(), os: z.string().nullable() }));

  return {
    browsers: getDistinctTextValues(rows, "browser"),
    osValues: getDistinctTextValues(rows, "os"),
  };
}

export async function listAdminTransactionPageRows(input: AdminTransactionsFilters) {
  const database = createAdminUserLogsRepositoryDatabase();
  const pageStart = (input.page - 1) * input.pageSize;
  const pageEnd = pageStart + input.pageSize - 1;
  const matchingProfiles = await listMatchingProfilesBySearch(input.search);
  const searchValue = input.search ? escapePostgrestSearchValue(input.search) : null;
  const baseQuery = database
    .from("transactions")
    .select(
      "id, user_id, subscription_id, package_id, package_name, source, status, amount_rp, created_at, updated_at, paid_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pageStart, pageEnd);

  let query = applyDateRangeFilters(baseQuery, "created_at", input.dateFrom, input.dateTo);

  if (input.source) {
    query = query.eq("source", input.source);
  }

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (searchValue) {
    const orFilters = [
      `package_name.ilike.%${searchValue}%`,
      ...buildUserIdOrFilters(
        matchingProfiles.map((row) => row.user_id),
        input.search!,
      ),
    ];
    query = query.or(orFilters.join(","));
  }

  const { count, data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(data, transactionRepositoryRowSchema);
  const profilesByUserId = buildProfileMap(await listProfilesByUserIds(rows.map((row) => row.user_id)));

  return {
    rows: rows
      .map((row) => {
        const profile = profilesByUserId.get(row.user_id);

        if (!profile) {
          return null;
        }

        return {
          ...row,
          ...profile,
        } satisfies AdminTransactionRepositoryRow;
      })
      .filter((row): row is AdminTransactionRepositoryRow => Boolean(row)),
    totalCount: count ?? 0,
  };
}

export async function sumAdminSuccessfulTransactionAmount(input: Omit<AdminTransactionsFilters, "page" | "pageSize">) {
  if (input.status && input.status !== "success") {
    return {
      successAmountRp: 0,
      successCount: 0,
    };
  }

  const database = createAdminUserLogsRepositoryDatabase();
  const matchingProfiles = await listMatchingProfilesBySearch(input.search);
  const searchValue = input.search ? escapePostgrestSearchValue(input.search) : null;
  const baseQuery = database.from("transactions").select("id, amount_rp, status").eq("status", "success");
  let query = applyDateRangeFilters(baseQuery, "created_at", input.dateFrom, input.dateTo);

  if (input.source) {
    query = query.eq("source", input.source);
  }

  if (searchValue) {
    const orFilters = [
      `package_name.ilike.%${searchValue}%`,
      ...buildUserIdOrFilters(
        matchingProfiles.map((row) => row.user_id),
        input.search!,
      ),
    ];
    query = query.or(orFilters.join(","));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(
    data,
    z.object({
      id: z.string().min(1),
      amount_rp: z.number().int(),
      status: z.literal("success"),
    }),
  );

  return {
    successAmountRp: rows.reduce((totalAmount, row) => totalAmount + row.amount_rp, 0),
    successCount: rows.length,
  };
}

export async function readAdminTransactionRepositoryRowById(transactionId: string) {
  const database = createAdminUserLogsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .select(
      "id, user_id, subscription_id, package_id, package_name, source, status, amount_rp, created_at, updated_at, paid_at",
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = transactionRepositoryRowSchema.parse(data);
  const profile = (await listProfilesByUserIds([row.user_id]))[0] ?? null;

  if (!profile) {
    return null;
  }

  return {
    ...row,
    ...profile,
  } satisfies AdminTransactionRepositoryRow;
}

export async function listAdminAssignmentSnapshotRowsBySubscriptionId(subscriptionId: string) {
  const database = createAdminUserLogsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .select(
      "id, subscription_id, asset_id, original_asset_id, access_key, asset_platform, asset_type, asset_note, asset_expires_at, assigned_at, revoked_at, revoke_reason, asset_deleted_at",
    )
    .eq("subscription_id", subscriptionId)
    .order("assigned_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return parseArrayRows(data, assignmentSnapshotRepositoryRowSchema);
}
