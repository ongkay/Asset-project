import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

const ACTIVE_CONSOLE_SUBSCRIPTION_STATUSES = ["active", "processed"] as const;

type ConsoleAssetAssignmentRow = {
  access_key: string;
  asset_id: string | null;
  asset_platform: "tradingview" | "fxreplay" | "fxtester";
  asset_type: "private" | "share";
  assigned_at: string;
  id: string;
  subscription_id: string;
};

type ConsoleAssetRow = {
  asset_type: "private" | "share";
  disabled_at: string | null;
  expires_at: string;
  id: string;
  note: string | null;
  platform: "tradingview" | "fxreplay" | "fxtester";
  proxy: string | null;
};

type ConsoleSnapshotRow = {
  assets: unknown[];
  subscription: unknown | null;
  transactions: unknown[];
};

type ConsoleAssetDetailRow = {
  access_key: string;
  account: string;
  asset_json: unknown;
  asset_type: "private" | "share";
  expires_at: string;
  id: string;
  note: string | null;
  platform: "tradingview" | "fxreplay" | "fxtester";
  proxy: string | null;
  subscription_id: string;
};

type ConsoleSubscriptionRow = {
  created_at: string;
  end_at: string;
  id: string;
  package_id: string;
  package_name: string;
  start_at: string;
  status: "active" | "processed" | "expired" | "canceled";
};

type ConsoleTransactionRow = {
  amount_rp: number;
  code: string;
  created_at: string;
  id: string;
  package_id: string;
  package_name: string;
  paid_at: string | null;
  source: "payment_dummy" | "cdkey" | "admin_manual";
  status: "pending" | "success" | "failed" | "canceled";
};

function calculateDaysLeft(endAt: string, now: Date) {
  return Math.max(0, Math.floor((new Date(endAt).getTime() - now.getTime()) / 86_400_000));
}

function createConsoleRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

export async function readConsoleSnapshotByUserId(userId: string) {
  const now = new Date();
  const nowIso = now.toISOString();
  const database = createConsoleRepositoryDatabase();

  const [subscriptionsResult, assignmentsResult, transactionsResult] = await Promise.all([
    database
      .from("subscriptions")
      .select("id, package_id, package_name, status, start_at, end_at, created_at")
      .eq("user_id", userId)
      .in("status", [...ACTIVE_CONSOLE_SUBSCRIPTION_STATUSES])
      .gt("end_at", nowIso)
      .order("created_at", { ascending: false }),
    database
      .from("asset_assignments")
      .select("id, subscription_id, asset_id, access_key, asset_platform, asset_type, assigned_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("assigned_at", { ascending: false }),
    database
      .from("transactions")
      .select("id, code, package_id, package_name, source, status, amount_rp, paid_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (subscriptionsResult.error) {
    throw subscriptionsResult.error;
  }

  if (assignmentsResult.error) {
    throw assignmentsResult.error;
  }

  if (transactionsResult.error) {
    throw transactionsResult.error;
  }

  const subscriptions = (subscriptionsResult.data ?? []) as ConsoleSubscriptionRow[];
  const assignments = (assignmentsResult.data ?? []) as ConsoleAssetAssignmentRow[];
  const activeSubscriptionIds = new Set(subscriptions.map((subscription) => subscription.id));
  const activeAssignments = assignments.filter(
    (assignment) => assignment.asset_id && activeSubscriptionIds.has(assignment.subscription_id),
  );

  let assetsById = new Map<string, ConsoleAssetRow>();

  if (activeAssignments.length > 0) {
    const { data, error } = await database
      .from("assets")
      .select("id, platform, asset_type, note, proxy, expires_at, disabled_at")
      .in(
        "id",
        activeAssignments
          .map((assignment) => assignment.asset_id!)
          .filter((assetId, index, assetIds) => assetIds.indexOf(assetId) === index),
      );

    if (error) {
      throw error;
    }

    assetsById = new Map(((data ?? []) as ConsoleAssetRow[]).map((asset) => [asset.id, asset]));
  }

  return {
    assets: activeAssignments
      .map((assignment) => {
        const asset = assetsById.get(assignment.asset_id!);

        if (!asset || asset.disabled_at || new Date(asset.expires_at).getTime() < now.getTime()) {
          return null;
        }

        return {
          access_key: assignment.access_key,
          asset_type: assignment.asset_type,
          assignment_id: assignment.id,
          expires_at: asset.expires_at,
          id: asset.id,
          note: asset.note,
          platform: assignment.asset_platform,
          proxy: asset.proxy,
          subscription_id: assignment.subscription_id,
        };
      })
      .filter((asset): asset is NonNullable<typeof asset> => asset !== null),
    subscription: subscriptions[0]
      ? {
          days_left: calculateDaysLeft(subscriptions[0].end_at, now),
          end_at: subscriptions[0].end_at,
          id: subscriptions[0].id,
          package_id: subscriptions[0].package_id,
          package_name: subscriptions[0].package_name,
          start_at: subscriptions[0].start_at,
          status: subscriptions[0].status,
        }
      : null,
    transactions: (transactionsResult.data ?? []) as ConsoleTransactionRow[],
  } satisfies ConsoleSnapshotRow;
}

export async function readConsoleAssetDetailByUserId(input: { assetId: string; userId: string }) {
  const now = new Date();
  const nowTime = now.getTime();
  const database = createConsoleRepositoryDatabase();
  const { data: assignmentRows, error: assignmentError } = await database
    .from("asset_assignments")
    .select("subscription_id, asset_id, access_key, asset_platform, asset_type")
    .eq("user_id", input.userId)
    .eq("asset_id", input.assetId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false });

  if (assignmentError) {
    throw assignmentError;
  }

  const assignments = (assignmentRows ?? []) as Array<{
    access_key: string;
    asset_id: string | null;
    asset_platform: "tradingview" | "fxreplay" | "fxtester";
    asset_type: "private" | "share";
    subscription_id: string;
  }>;

  for (const assignment of assignments) {
    if (!assignment.asset_id) {
      continue;
    }

    const [subscriptionResult, assetResult] = await Promise.all([
      database.from("subscriptions").select("id, status, end_at").eq("id", assignment.subscription_id).maybeSingle(),
      database
        .from("assets")
        .select("id, note, proxy, expires_at, disabled_at, account, asset_json")
        .eq("id", assignment.asset_id)
        .maybeSingle(),
    ]);

    if (subscriptionResult.error) {
      throw subscriptionResult.error;
    }

    if (assetResult.error) {
      throw assetResult.error;
    }

    const subscription = subscriptionResult.data as Pick<ConsoleSubscriptionRow, "end_at" | "id" | "status"> | null;
    const asset = assetResult.data as
      | ({
          account: string;
          asset_json: unknown;
        } & Pick<ConsoleAssetRow, "disabled_at" | "expires_at" | "id" | "note" | "proxy">)
      | null;

    if (
      !subscription ||
      !ACTIVE_CONSOLE_SUBSCRIPTION_STATUSES.includes(
        subscription.status as (typeof ACTIVE_CONSOLE_SUBSCRIPTION_STATUSES)[number],
      ) ||
      new Date(subscription.end_at).getTime() <= nowTime ||
      !asset ||
      asset.disabled_at !== null ||
      new Date(asset.expires_at).getTime() < nowTime
    ) {
      continue;
    }

    return {
      access_key: assignment.access_key,
      account: asset.account,
      asset_json: asset.asset_json,
      asset_type: assignment.asset_type,
      expires_at: asset.expires_at,
      id: asset.id,
      note: asset.note,
      platform: assignment.asset_platform,
      proxy: asset.proxy,
      subscription_id: assignment.subscription_id,
    } satisfies ConsoleAssetDetailRow;
  }

  return null;
}

export async function readLatestConsoleSubscriptionByUserId(userId: string) {
  const { data, error } = await createInsForgeAdminDatabase()
    .from("subscriptions")
    .select("id, package_id, package_name, status, start_at, end_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ConsoleSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}
