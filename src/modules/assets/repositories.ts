import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type {
  AssetActiveAssignmentRow,
  AssetFormInput,
  AssetProfileRow,
  AssetRow,
  AssetStatus,
  AssetStatusRow,
  AssetSubscriptionRow,
  AssetToggleInput,
  AssetType,
} from "./types";

type AssetDatabaseRow = {
  id: string;
  platform: "tradingview" | "fxreplay" | "fxtester";
  asset_type: "private" | "share";
  account: string;
  note: string | null;
  proxy: string | null;
  asset_json: unknown;
  expires_at: string;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

type AssetStatusDatabaseRow = {
  asset_id: string;
  platform: "tradingview" | "fxreplay" | "fxtester";
  asset_type: "private" | "share";
  expires_at: string;
  disabled_at: string | null;
  active_use: number;
  status: AssetStatus;
};

type AssetAssignmentDatabaseRow = {
  id: string;
  subscription_id: string;
  user_id: string;
  asset_id: string;
  access_key: string;
  assigned_at: string;
};

type ProfileDatabaseRow = {
  user_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
};

type SubscriptionDatabaseRow = {
  id: string;
  status: "active" | "processed" | "expired" | "canceled";
};

const assetDatabaseRowSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
  account: z.string().min(1),
  note: z.string().nullable(),
  proxy: z.string().nullable(),
  asset_json: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]),
  expires_at: z.string().min(1),
  disabled_at: z.string().nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const assetStatusDatabaseRowSchema = z.object({
  asset_id: z.string().min(1),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
  expires_at: z.string().min(1),
  disabled_at: z.string().nullable(),
  active_use: z.number().int().nonnegative(),
  status: z.enum(["available", "assigned", "expired", "disabled"]),
});

const assetAssignmentDatabaseRowSchema = z.object({
  id: z.string().min(1),
  subscription_id: z.string().min(1),
  user_id: z.string().min(1),
  asset_id: z.string().min(1),
  access_key: z.string().min(1),
  assigned_at: z.string().min(1),
});

const profileDatabaseRowSchema = z.object({
  user_id: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  avatar_url: z.string().nullable(),
});

const subscriptionDatabaseRowSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "processed", "expired", "canceled"]),
});

function createAssetsRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

const ASSET_SELECT_FIELDS =
  "id, platform, asset_type, account, note, proxy, asset_json, expires_at, disabled_at, created_at, updated_at";

function parseAssetRows(data: unknown): AssetDatabaseRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(assetDatabaseRowSchema).parse(data);
}

function parseAssetStatusRows(data: unknown): AssetStatusDatabaseRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(assetStatusDatabaseRowSchema).parse(data);
}

function parseAssetAssignmentRows(data: unknown): AssetAssignmentDatabaseRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(assetAssignmentDatabaseRowSchema).parse(data);
}

function parseProfileRows(data: unknown): ProfileDatabaseRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(profileDatabaseRowSchema).parse(data);
}

function parseSubscriptionRows(data: unknown): SubscriptionDatabaseRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(subscriptionDatabaseRowSchema).parse(data);
}

function mapAssetDatabaseRow(data: AssetDatabaseRow): AssetRow {
  return {
    id: data.id,
    platform: data.platform,
    assetType: data.asset_type,
    account: data.account,
    note: data.note,
    proxy: data.proxy,
    assetJson: data.asset_json as AssetRow["assetJson"],
    expiresAt: data.expires_at,
    disabledAt: data.disabled_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapAssetStatusDatabaseRow(data: AssetStatusDatabaseRow): AssetStatusRow {
  return {
    id: data.asset_id,
    platform: data.platform,
    assetType: data.asset_type,
    expiresAt: data.expires_at,
    disabledAt: data.disabled_at,
    totalUsed: data.active_use,
    status: data.status,
  };
}

function sanitizeIlikeTerm(input: string) {
  return input.replace(/,/g, " ").trim();
}

export async function getAssetById(assetId: string): Promise<AssetRow | null> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database.from("assets").select(ASSET_SELECT_FIELDS).eq("id", assetId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapAssetDatabaseRow(assetDatabaseRowSchema.parse(data));
}

export async function getAssetUsageSummary(assetId: string): Promise<{ totalUsed: number }> {
  const database = createAssetsRepositoryDatabase();
  const { count, error } = await database
    .from("asset_assignments")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  return {
    totalUsed: count ?? 0,
  };
}

export async function createAssetRow(input: AssetFormInput): Promise<AssetRow> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("assets")
    .insert([
      {
        platform: input.platform,
        asset_type: input.assetType,
        account: input.account,
        note: input.note,
        proxy: input.proxy,
        asset_json: input.assetJson,
        expires_at: input.expiresAt,
      },
    ])
    .select(ASSET_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return mapAssetDatabaseRow(assetDatabaseRowSchema.parse(data));
}

export async function updateAssetRow(input: { id: string } & AssetFormInput): Promise<AssetRow> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("assets")
    .update({
      platform: input.platform,
      asset_type: input.assetType,
      account: input.account,
      note: input.note,
      proxy: input.proxy,
      asset_json: input.assetJson,
      expires_at: input.expiresAt,
    })
    .eq("id", input.id)
    .select(ASSET_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return mapAssetDatabaseRow(assetDatabaseRowSchema.parse(data));
}

export async function disableAssetRow(input: { id: string }): Promise<AssetRow> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("assets")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", input.id)
    .select(ASSET_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return mapAssetDatabaseRow(assetDatabaseRowSchema.parse(data));
}

export async function enableAssetRow(input: { id: string }): Promise<AssetRow> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("assets")
    .update({ disabled_at: null })
    .eq("id", input.id)
    .select(ASSET_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return mapAssetDatabaseRow(assetDatabaseRowSchema.parse(data));
}

export async function recheckAssetSubscriptionsAfterChange(input: { id: string }) {
  const database = createAssetsRepositoryDatabase();
  const { error } = await database.rpc("recheck_subscription_after_asset_change", {
    p_asset_id: input.id,
  });

  if (error) {
    throw error;
  }
}

export async function deleteAssetRowSafely(input: { id: string }) {
  const database = createAssetsRepositoryDatabase();
  const { error } = await database.rpc("delete_asset_safely", {
    p_asset_id: input.id,
  });

  if (error) {
    throw error;
  }
}

export async function getAssetStatusById(assetId: string): Promise<AssetStatusRow | null> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database.from("v_asset_status").select("*").eq("asset_id", assetId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapAssetStatusDatabaseRow(assetStatusDatabaseRowSchema.parse(data));
}

export async function listAssetStatusesByIds(assetIds: string[]): Promise<AssetStatusRow[]> {
  if (assetIds.length === 0) {
    return [];
  }

  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database.from("v_asset_status").select("*").in("asset_id", assetIds);

  if (error) {
    throw error;
  }

  return parseAssetStatusRows(data).map(mapAssetStatusDatabaseRow);
}

export async function listAssetIdsByStatusFilter(input: {
  status: AssetStatus;
  assetType: AssetType | null;
  expiresFromIso: string | null;
  expiresToIso: string | null;
}): Promise<string[]> {
  const database = createAssetsRepositoryDatabase();
  let query = database.from("v_asset_status").select("asset_id").eq("status", input.status);

  if (input.assetType) {
    query = query.eq("asset_type", input.assetType);
  }

  if (input.expiresFromIso) {
    query = query.gte("expires_at", input.expiresFromIso);
  }

  if (input.expiresToIso) {
    query = query.lte("expires_at", input.expiresToIso);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = z.array(z.object({ asset_id: z.string().min(1) })).parse(Array.isArray(data) ? data : []);
  return rows.map((row) => row.asset_id);
}

export async function listAssetIdsByPlatformOrNoteSearch(searchTerm: string): Promise<string[]> {
  const normalizedSearch = sanitizeIlikeTerm(searchTerm);

  if (!normalizedSearch) {
    return [];
  }

  const normalizedSearchLower = normalizedSearch.toLowerCase();
  const matchedPlatforms = (["tradingview", "fxreplay", "fxtester"] as const).filter((platform) =>
    platform.includes(normalizedSearchLower),
  );

  const database = createAssetsRepositoryDatabase();
  const ilikeSearch = `%${normalizedSearch}%`;
  const [{ data: noteRows, error: noteError }, { data: platformRows, error: platformError }] = await Promise.all([
    database.from("assets").select("id").ilike("note", ilikeSearch),
    matchedPlatforms.length > 0
      ? database
          .from("assets")
          .select("id")
          .in("platform", [...matchedPlatforms])
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (noteError) {
    throw noteError;
  }

  if (platformError) {
    throw platformError;
  }

  const noteAssetIds = z
    .array(z.object({ id: z.string().min(1) }))
    .parse(Array.isArray(noteRows) ? noteRows : [])
    .map((row) => row.id);
  const platformAssetIds = z
    .array(z.object({ id: z.string().min(1) }))
    .parse(Array.isArray(platformRows) ? platformRows : [])
    .map((row) => row.id);

  return [...new Set([...noteAssetIds, ...platformAssetIds])];
}

export async function listUserIdsByIdentitySearch(searchTerm: string): Promise<string[]> {
  const normalizedSearch = sanitizeIlikeTerm(searchTerm);

  if (!normalizedSearch) {
    return [];
  }

  const database = createAssetsRepositoryDatabase();
  const ilikeSearch = `%${normalizedSearch}%`;
  const { data, error } = await database
    .from("profiles")
    .select("user_id")
    .or(`username.ilike.${ilikeSearch},email.ilike.${ilikeSearch}`);

  if (error) {
    throw error;
  }

  const rows = z.array(z.object({ user_id: z.string().min(1) })).parse(Array.isArray(data) ? data : []);
  return rows.map((row) => row.user_id);
}

export async function listActiveAssetIdsByUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) {
    return [];
  }

  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .select("asset_id")
    .in("user_id", userIds)
    .is("revoked_at", null)
    .not("asset_id", "is", null);

  if (error) {
    throw error;
  }

  const rows = z.array(z.object({ asset_id: z.string().min(1) })).parse(Array.isArray(data) ? data : []);
  return rows.map((row) => row.asset_id);
}

export async function listAssetsPage(input: {
  page: number;
  pageSize: number;
  assetType: AssetType | null;
  expiresFromIso: string | null;
  expiresToIso: string | null;
  filteredAssetIds: string[] | null;
}): Promise<{
  items: AssetRow[];
  totalCount: number;
}> {
  if (input.filteredAssetIds && input.filteredAssetIds.length === 0) {
    return {
      items: [],
      totalCount: 0,
    };
  }

  const database = createAssetsRepositoryDatabase();
  const startIndex = (input.page - 1) * input.pageSize;
  const endIndex = startIndex + input.pageSize - 1;

  let query = database
    .from("assets")
    .select(ASSET_SELECT_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(startIndex, endIndex);

  if (input.assetType) {
    query = query.eq("asset_type", input.assetType);
  }

  if (input.expiresFromIso) {
    query = query.gte("expires_at", input.expiresFromIso);
  }

  if (input.expiresToIso) {
    query = query.lte("expires_at", input.expiresToIso);
  }

  if (input.filteredAssetIds) {
    query = query.in("id", input.filteredAssetIds);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    items: parseAssetRows(data).map(mapAssetDatabaseRow),
    totalCount: count ?? 0,
  };
}

export async function listActiveAssignmentsForAsset(assetId: string): Promise<AssetActiveAssignmentRow[]> {
  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .select("id, subscription_id, user_id, asset_id, access_key, assigned_at")
    .eq("asset_id", assetId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false });

  if (error) {
    throw error;
  }

  return parseAssetAssignmentRows(data).map((row) => ({
    id: row.id,
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    assetId: row.asset_id,
    accessKey: row.access_key,
    assignedAt: row.assigned_at,
  }));
}

export async function listProfilesByUserIds(userIds: string[]): Promise<AssetProfileRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database
    .from("profiles")
    .select("user_id, username, email, avatar_url")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return parseProfileRows(data).map((row) => ({
    userId: row.user_id,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url,
  }));
}

export async function listSubscriptionsByIds(subscriptionIds: string[]): Promise<AssetSubscriptionRow[]> {
  if (subscriptionIds.length === 0) {
    return [];
  }

  const database = createAssetsRepositoryDatabase();
  const { data, error } = await database.from("subscriptions").select("id, status").in("id", subscriptionIds);

  if (error) {
    throw error;
  }

  return parseSubscriptionRows(data).map((row) => ({
    id: row.id,
    status: row.status,
  }));
}

export async function countActiveAssignmentsByAssetId(assetId: string): Promise<number> {
  const database = createAssetsRepositoryDatabase();
  const { count, error } = await database
    .from("asset_assignments")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function toggleAssetDisabledRow(input: AssetToggleInput): Promise<AssetRow> {
  if (input.disabled) {
    return disableAssetRow({ id: input.id });
  }

  return enableAssetRow({ id: input.id });
}
