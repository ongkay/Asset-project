import "server-only";

import { z } from "zod";

import { listAssetStatusesByIds } from "@/modules/assets/repositories";
import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type {
  SubscriptionAssignmentRow,
  SubscriptionPackageSnapshot,
  SubscriptionRow,
  SubscriptionStatus,
  TransactionCreateInput,
  TransactionRow,
} from "./types";

type PackageDatabaseRow = {
  id: string;
  name: string;
  amount_rp: number;
  duration_days: number;
  is_extended: boolean;
  access_keys_json: unknown;
  is_active: boolean;
};

type SubscriptionDatabaseRow = {
  id: string;
  user_id: string;
  package_id: string;
  package_name: string;
  access_keys_json: unknown;
  status: SubscriptionStatus;
  source: "payment_dummy" | "cdkey" | "admin_manual";
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
};

const accessKeysJsonSchema = z.array(z.string().min(1));

const packageDatabaseRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount_rp: z.number().int().nonnegative(),
  duration_days: z.number().int().positive(),
  is_extended: z.boolean(),
  access_keys_json: z.unknown(),
  is_active: z.boolean(),
});

const subscriptionDatabaseRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  package_id: z.string().min(1),
  package_name: z.string().min(1),
  access_keys_json: z.unknown(),
  status: z.enum(["active", "processed", "expired", "canceled"]),
  source: z.enum(["payment_dummy", "cdkey", "admin_manual"]),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const assetAssignmentDatabaseRowSchema = z.object({
  id: z.string().min(1),
  subscription_id: z.string().min(1),
  user_id: z.string().min(1),
  asset_id: z.string().nullable(),
  access_key: z.string().min(1),
  asset_platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
  asset_note: z.string().nullable(),
  asset_expires_at: z.string().min(1),
});

const assetAssignmentUsageDatabaseRowSchema = z.object({
  id: z.string().min(1),
  asset_id: z.string().nullable(),
  user_id: z.string().min(1),
  subscription_id: z.string().min(1),
  asset_platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
});

const assetDatabaseRowSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  asset_type: z.enum(["private", "share"]),
  note: z.string().nullable(),
  expires_at: z.string().min(1),
  disabled_at: z.string().nullable(),
  created_at: z.string().min(1),
});

const profileDatabaseRowSchema = z.object({
  user_id: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  avatar_url: z.string().nullable(),
  role: z.enum(["member", "admin"]),
});

const transactionDatabaseRowSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
});

const transactionAmountDatabaseRowSchema = z.object({
  user_id: z.string().min(1),
  amount_rp: z.number().int().nonnegative(),
});

function createSubscriptionsRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

function mapPackageDatabaseRow(row: PackageDatabaseRow): SubscriptionPackageSnapshot {
  return {
    packageId: row.id,
    name: row.name,
    amountRp: row.amount_rp,
    durationDays: row.duration_days,
    isExtended: row.is_extended,
    accessKeys: accessKeysJsonSchema.parse(row.access_keys_json),
    isActive: row.is_active,
  };
}

function mapSubscriptionDatabaseRow(row: SubscriptionDatabaseRow): SubscriptionRow {
  return {
    id: row.id,
    userId: row.user_id,
    packageId: row.package_id,
    packageName: row.package_name,
    accessKeys: accessKeysJsonSchema.parse(row.access_keys_json),
    status: row.status,
    source: row.source,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseArrayRows<TRow>(data: unknown, schema: z.ZodType<TRow>): TRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(schema).parse(data);
}

function getPackageSummary(accessKeys: string[]) {
  const hasPrivate = accessKeys.some((accessKey) => accessKey.endsWith(":private"));
  const hasShare = accessKeys.some((accessKey) => accessKey.endsWith(":share"));

  if (hasPrivate && hasShare) {
    return "mixed" as const;
  }

  return hasPrivate ? ("private" as const) : ("share" as const);
}

function deriveAssetStatus(input: {
  disabledAt: string | null;
  expiresAt: string;
  assetType: "private" | "share";
  totalUsed: number;
}) {
  if (input.disabledAt) {
    return "disabled" as const;
  }

  if (new Date(input.expiresAt).getTime() < Date.now()) {
    return "expired" as const;
  }

  if (input.assetType === "private" && input.totalUsed > 0) {
    return "assigned" as const;
  }

  return "available" as const;
}

function sanitizeSearchTerm(searchTerm: string) {
  return searchTerm.trim().toLowerCase();
}

export async function getPackageById(packageId: string): Promise<SubscriptionPackageSnapshot | null> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .select("id, name, amount_rp, duration_days, is_extended, access_keys_json, is_active")
    .eq("id", packageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPackageDatabaseRow(packageDatabaseRowSchema.parse(data));
}

export async function listPackagesForAdminSelection() {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .select("id, name, amount_rp, duration_days, is_extended, access_keys_json, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return parseArrayRows(data, packageDatabaseRowSchema).map((row) => {
    const packageSnapshot = mapPackageDatabaseRow(row);

    return {
      ...packageSnapshot,
      packageSummary: getPackageSummary(packageSnapshot.accessKeys),
    };
  });
}

export async function getRunningSubscriptionByUserId(userId: string): Promise<SubscriptionRow | null> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .select(
      "id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .in("status", ["active", "processed"])
    .gt("end_at", new Date().toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSubscriptionDatabaseRow(subscriptionDatabaseRowSchema.parse(data));
}

export async function getSubscriptionById(subscriptionId: string): Promise<SubscriptionRow | null> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .select(
      "id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, created_at, updated_at",
    )
    .eq("id", subscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSubscriptionDatabaseRow(subscriptionDatabaseRowSchema.parse(data));
}

export async function listActiveAssignmentsBySubscriptionId(
  subscriptionId: string,
): Promise<SubscriptionAssignmentRow[]> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .select("id, asset_id, access_key")
    .eq("subscription_id", subscriptionId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(
    data,
    z.object({
      id: z.string().min(1),
      asset_id: z.string().nullable(),
      access_key: z.string().min(1),
    }),
  );

  return rows.map((row) => ({
    id: row.id,
    accessKey: row.access_key,
    assetId: row.asset_id,
  }));
}

export async function listCurrentAssignmentsBySubscriptionId(subscriptionId: string) {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .select(
      "id, subscription_id, user_id, asset_id, access_key, asset_platform, asset_type, asset_note, asset_expires_at",
    )
    .eq("subscription_id", subscriptionId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: true });

  if (error) {
    throw error;
  }

  return parseArrayRows(data, assetAssignmentDatabaseRowSchema).map((row) => ({
    accessKey: row.access_key,
    assetId: row.asset_id ?? "",
    platform: row.asset_platform,
    assetType: row.asset_type,
    note: row.asset_note,
    expiresAt: row.asset_expires_at,
    assignmentId: row.id,
  }));
}

export async function listCandidateAssetsByAccessKey(input: {
  accessKey: string;
  userId: string;
  subscriptionId?: string | null;
}) {
  const [platform, assetType] = input.accessKey.split(":") as [
    "tradingview" | "fxreplay" | "fxtester",
    "private" | "share",
  ];
  const database = createSubscriptionsRepositoryDatabase();
  const nowIso = new Date().toISOString();

  const [assetsResult, currentAssignmentsResult] = await Promise.all([
    database
      .from("assets")
      .select("id, platform, asset_type, note, expires_at, disabled_at, created_at")
      .eq("platform", platform)
      .eq("asset_type", assetType)
      .is("disabled_at", null)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .order("created_at", { ascending: true }),
    input.subscriptionId
      ? database
          .from("asset_assignments")
          .select(
            "id, subscription_id, user_id, asset_id, access_key, asset_platform, asset_type, asset_note, asset_expires_at",
          )
          .eq("subscription_id", input.subscriptionId)
          .eq("access_key", input.accessKey)
          .is("revoked_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assetsResult.error) {
    throw assetsResult.error;
  }

  if (currentAssignmentsResult.error) {
    throw currentAssignmentsResult.error;
  }

  const assets = parseArrayRows(assetsResult.data, assetDatabaseRowSchema);
  const currentAssignments = parseArrayRows(currentAssignmentsResult.data, assetAssignmentDatabaseRowSchema);
  const currentSelectionAssetId = currentAssignments.at(0)?.asset_id ?? null;

  if (assets.length === 0) {
    return [];
  }

  const assetIds = assets.map((asset) => asset.id);
  const [assetStatuses, activeAssignmentsResult] = await Promise.all([
    listAssetStatusesByIds(assetIds),
    database
      .from("asset_assignments")
      .select("id, asset_id, user_id, subscription_id, asset_platform, asset_type")
      .in("asset_id", assetIds)
      .is("revoked_at", null),
  ]);

  if (activeAssignmentsResult.error) {
    throw activeAssignmentsResult.error;
  }

  const activeAssignments = parseArrayRows(activeAssignmentsResult.data, assetAssignmentUsageDatabaseRowSchema);
  const statusByAssetId = new Map(assetStatuses.map((statusRow) => [statusRow.id, statusRow]));
  const shareConflictExists = activeAssignments.some(
    (assignment) =>
      assignment.user_id === input.userId &&
      assignment.asset_platform === platform &&
      assignment.asset_type === "share" &&
      assignment.asset_id !== currentSelectionAssetId,
  );

  return assets
    .filter((asset) => {
      if (assetType === "private") {
        const hasOtherActiveAssignment = activeAssignments.some(
          (assignment) => assignment.asset_id === asset.id && asset.id !== currentSelectionAssetId,
        );

        return !hasOtherActiveAssignment || asset.id === currentSelectionAssetId;
      }

      if (shareConflictExists && asset.id !== currentSelectionAssetId) {
        return false;
      }

      return true;
    })
    .map((asset) => {
      const statusRow = statusByAssetId.get(asset.id);
      const totalUsed = statusRow?.totalUsed ?? 0;

      return {
        assetId: asset.id,
        platform: asset.platform,
        assetType: asset.asset_type,
        note: asset.note,
        expiresAt: asset.expires_at,
        status:
          statusRow?.status ??
          deriveAssetStatus({
            disabledAt: asset.disabled_at,
            expiresAt: asset.expires_at,
            assetType: asset.asset_type,
            totalUsed,
          }),
        totalUsed,
      };
    });
}

export async function listSubscriberSubscriptionsForTable(_input: {
  search: string | null;
  assetType: "private" | "share" | null;
  status: "active" | "processed" | "expired" | "canceled" | null;
  expiresFrom: string | null;
  expiresTo: string | null;
  page: number;
  pageSize: number;
}) {
  const database = createSubscriptionsRepositoryDatabase();
  const [profileResult, subscriptionResult] = await Promise.all([
    database.from("profiles").select("user_id, username, email, avatar_url, role").eq("role", "member"),
    database
      .from("subscriptions")
      .select(
        "id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (subscriptionResult.error) {
    throw subscriptionResult.error;
  }

  const profiles = parseArrayRows(profileResult.data, profileDatabaseRowSchema);
  const subscriptions = parseArrayRows(subscriptionResult.data, subscriptionDatabaseRowSchema);
  const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const nowTimestamp = Date.now();

  return subscriptions
    .filter((subscription) => profileByUserId.has(subscription.user_id))
    .map((subscription) => {
      const profile = profileByUserId.get(subscription.user_id)!;
      const mappedSubscription = mapSubscriptionDatabaseRow(subscription);

      return {
        subscriptionId: mappedSubscription.id,
        userId: mappedSubscription.userId,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        packageId: mappedSubscription.packageId,
        packageName: mappedSubscription.packageName,
        accessKeys: mappedSubscription.accessKeys,
        status: mappedSubscription.status,
        startAt: mappedSubscription.startAt,
        endAt: mappedSubscription.endAt,
        createdAt: mappedSubscription.createdAt,
        updatedAt: mappedSubscription.updatedAt,
        isRunning:
          ["active", "processed"].includes(mappedSubscription.status) &&
          new Date(mappedSubscription.endAt).getTime() > nowTimestamp,
      };
    });
}

export async function listSuccessfulTransactionTotalsByUserIds(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) {
    return {};
  }

  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .select("user_id, amount_rp")
    .in("user_id", userIds)
    .eq("status", "success");

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(data, transactionAmountDatabaseRowSchema);
  return rows.reduce<Record<string, number>>((result, row) => {
    result[row.user_id] = (result[row.user_id] ?? 0) + row.amount_rp;
    return result;
  }, {});
}

export async function searchMemberProfiles(input: { query: string; page: number; pageSize: number }) {
  const database = createSubscriptionsRepositoryDatabase();
  const normalizedQuery = sanitizeSearchTerm(input.query);
  const [profileResult, currentSubscriptionsResult] = await Promise.all([
    database.from("profiles").select("user_id, username, email, avatar_url, role").eq("role", "member"),
    database.from("v_current_subscriptions").select("user_id, subscription_id, status"),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (currentSubscriptionsResult.error) {
    throw currentSubscriptionsResult.error;
  }

  const profiles = parseArrayRows(profileResult.data, profileDatabaseRowSchema).filter((profile) => {
    if (!normalizedQuery) {
      return true;
    }

    return [profile.user_id, profile.username, profile.email].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });

  const currentSubscriptions = parseArrayRows(
    currentSubscriptionsResult.data,
    z.object({
      user_id: z.string().min(1),
      subscription_id: z.string().min(1),
      status: z.enum(["active", "processed"]),
    }),
  );
  const currentSubscriptionByUserId = new Map(
    currentSubscriptions.map((subscription) => [subscription.user_id, subscription]),
  );
  const pageStart = (input.page - 1) * input.pageSize;
  const pageEnd = pageStart + input.pageSize;

  return {
    users: profiles.slice(pageStart, pageEnd).map((profile) => {
      const currentSubscription = currentSubscriptionByUserId.get(profile.user_id);

      return {
        userId: profile.user_id,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        currentSubscriptionId: currentSubscription?.subscription_id ?? null,
        currentSubscriptionStatus: currentSubscription?.status ?? null,
      };
    }),
    totalCount: profiles.length,
  };
}

export async function updateSubscriptionWindow(input: {
  subscriptionId: string;
  endAt: string;
}): Promise<SubscriptionRow> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .update({
      end_at: input.endAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.subscriptionId)
    .select(
      "id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapSubscriptionDatabaseRow(subscriptionDatabaseRowSchema.parse(data));
}

export async function createSubscriptionWithSnapshot(input: {
  userId: string;
  packageId: string;
  packageName: string;
  accessKeys: string[];
  source: "admin_manual";
  startAt: string;
  endAt: string;
  status: "processed";
}): Promise<SubscriptionRow> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .insert([
      {
        user_id: input.userId,
        package_id: input.packageId,
        package_name: input.packageName,
        access_keys_json: input.accessKeys,
        source: input.source,
        start_at: input.startAt,
        end_at: input.endAt,
        status: input.status,
      },
    ])
    .select(
      "id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapSubscriptionDatabaseRow(subscriptionDatabaseRowSchema.parse(data));
}

export async function cancelSubscriptionRow(input: {
  subscriptionId: string;
  cancelReason: string;
}): Promise<SubscriptionRow> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_reason: input.cancelReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.subscriptionId)
    .select(
      "id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapSubscriptionDatabaseRow(subscriptionDatabaseRowSchema.parse(data));
}

export async function revokeActiveAssignmentsBySubscriptionId(input: {
  subscriptionId: string;
  revokeReason: string;
}): Promise<{ count: number }> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: input.revokeReason,
    })
    .eq("subscription_id", input.subscriptionId)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    throw error;
  }

  const rows = parseArrayRows(data, z.object({ id: z.string().min(1) }));
  return {
    count: rows.length,
  };
}

export async function insertManualAssignmentRow(input: {
  subscriptionId: string;
  userId: string;
  accessKey: string;
  assetId: string;
}): Promise<{ id: string }> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("asset_assignments")
    .insert([
      {
        subscription_id: input.subscriptionId,
        user_id: input.userId,
        asset_id: input.assetId,
        original_asset_id: input.assetId,
        access_key: input.accessKey,
      },
    ])
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return z.object({ id: z.string().min(1) }).parse(data);
}

export async function assignBestAssetForSubscription(input: {
  subscriptionId: string;
  accessKey: string;
  excludeAssetId?: string | null;
}): Promise<string | null> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database.rpc("assign_best_asset", {
    p_subscription_id: input.subscriptionId,
    p_access_key: input.accessKey,
    p_exclude_asset_id: input.excludeAssetId ?? null,
  });

  if (error) {
    throw error;
  }

  return z
    .string()
    .uuid()
    .nullable()
    .parse(data ?? null);
}

export async function applySubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database.rpc("apply_subscription_status", {
    p_subscription_id: subscriptionId,
  });

  if (error) {
    throw error;
  }

  return z.enum(["active", "processed", "expired", "canceled"]).parse(data);
}

export async function createTransactionRow(input: TransactionCreateInput): Promise<TransactionRow> {
  const database = createSubscriptionsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .insert([
      {
        code: input.code,
        user_id: input.userId,
        subscription_id: input.subscriptionId,
        package_id: input.packageId,
        package_name: input.packageName,
        source: input.source,
        status: input.status,
        amount_rp: input.amountRp,
        paid_at: input.paidAt,
      },
    ])
    .select("id, code")
    .single();

  if (error) {
    throw error;
  }

  return transactionDatabaseRowSchema.parse(data);
}
