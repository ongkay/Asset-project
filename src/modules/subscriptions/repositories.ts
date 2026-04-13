import "server-only";

import { z } from "zod";

import { addDays, max } from "date-fns";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type { ActivationResult, PackageActivationSnapshot, RunningSubscription } from "./types";

type PackageRow = {
  access_keys_json: string[];
  amount_rp: number;
  duration_days: number;
  id: string;
  is_active: boolean;
  is_extended: boolean;
  name: string;
};

type SubscriptionRow = {
  access_keys_json: string[];
  end_at: string;
  id: string;
  package_id: string;
  package_name: string;
  start_at: string;
  status: RunningSubscription["status"];
  user_id: string;
};

const activationResultSchema = z.object({
  nextRunningSubscriptionId: z.uuid(),
  previousRunningSubscriptionId: z.uuid().nullable(),
  subscriptionStatus: z.enum(["active", "processed", "expired", "canceled"]),
  transaction: z.object({
    amountRp: z.number().int().nonnegative(),
    code: z.string().trim().min(1),
    createdAt: z.iso.datetime(),
    id: z.uuid(),
    packageId: z.uuid(),
    packageName: z.string().trim().min(1),
    source: z.enum(["payment_dummy", "cdkey", "admin_manual"]),
    status: z.enum(["pending", "success", "failed", "canceled"]),
    subscriptionId: z.uuid().nullable(),
    userId: z.uuid(),
  }),
});

function createSubscriptionsDatabase() {
  return createInsForgeAdminDatabase();
}

export async function findPackageActivationSnapshot(packageId: string): Promise<PackageActivationSnapshot | null> {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database
    .from("packages")
    .select("id, name, amount_rp, duration_days, is_extended, access_keys_json, is_active")
    .eq("id", packageId)
    .maybeSingle<PackageRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    accessKeys: data.access_keys_json,
    amountRp: data.amount_rp,
    durationDays: data.duration_days,
    id: data.id,
    isActive: data.is_active,
    isExtended: data.is_extended,
    name: data.name,
  };
}

export async function findRunningSubscriptionForUser(userId: string): Promise<RunningSubscription | null> {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .select("id, user_id, package_id, package_name, access_keys_json, status, start_at, end_at")
    .eq("user_id", userId)
    .in("status", ["active", "processed"])
    .gt("end_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    accessKeys: data.access_keys_json,
    endAt: data.end_at,
    id: data.id,
    packageId: data.package_id,
    packageName: data.package_name,
    startAt: data.start_at,
    status: data.status,
    userId: data.user_id,
  };
}

export function calculateActivationWindow(input: {
  activatedAt: Date;
  durationDays: number;
  isExtended: boolean;
  runningSubscription: RunningSubscription | null;
  targetPackageId: string;
}) {
  if (!input.runningSubscription) {
    return {
      endAt: addDays(input.activatedAt, input.durationDays),
      extendExisting: false,
      replaceRunning: false,
      startAt: input.activatedAt,
    };
  }

  const isSamePackage = input.runningSubscription.packageId === input.targetPackageId;

  if (input.isExtended && isSamePackage) {
    const runningEndAt = new Date(input.runningSubscription.endAt);
    const base = max([runningEndAt, input.activatedAt]);

    return {
      endAt: addDays(base, input.durationDays),
      extendExisting: true,
      replaceRunning: false,
      startAt: new Date(input.runningSubscription.startAt),
    };
  }

  if (input.isExtended) {
    const runningEndAt = new Date(input.runningSubscription.endAt);
    const base = max([runningEndAt, input.activatedAt]);

    return {
      endAt: addDays(base, input.durationDays),
      extendExisting: false,
      replaceRunning: true,
      startAt: input.activatedAt,
    };
  }

  return {
    endAt: addDays(input.activatedAt, input.durationDays),
    extendExisting: false,
    replaceRunning: true,
    startAt: input.activatedAt,
  };
}

export async function extendRunningSubscription(input: {
  endAt: Date;
  source: "payment_dummy" | "cdkey" | "admin_manual";
  subscriptionId: string;
}) {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .update({
      end_at: input.endAt.toISOString(),
      source: input.source,
    })
    .eq("id", input.subscriptionId)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function replaceRunningSubscription(input: { cancelReason: string; subscriptionId: string }) {
  const database = createSubscriptionsDatabase();

  const { error: subscriptionError } = await database
    .from("subscriptions")
    .update({
      cancel_reason: input.cancelReason,
      status: "canceled",
    })
    .eq("id", input.subscriptionId)
    .in("status", ["active", "processed"]);

  if (subscriptionError) {
    throw subscriptionError;
  }

  const { error: assignmentError } = await database
    .from("asset_assignments")
    .update({
      revoke_reason: input.cancelReason,
      revoked_at: new Date().toISOString(),
    })
    .eq("subscription_id", input.subscriptionId)
    .is("revoked_at", null);

  if (assignmentError) {
    throw assignmentError;
  }
}

export async function insertSubscription(input: {
  accessKeys: string[];
  endAt: Date;
  packageId: string;
  packageName: string;
  source: "payment_dummy" | "cdkey" | "admin_manual";
  startAt: Date;
  userId: string;
}) {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database
    .from("subscriptions")
    .insert([
      {
        access_keys_json: input.accessKeys,
        end_at: input.endAt.toISOString(),
        package_id: input.packageId,
        package_name: input.packageName,
        source: input.source,
        start_at: input.startAt.toISOString(),
        status: "processed",
        user_id: input.userId,
      },
    ])
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function assignBestAssetForAccessKey(subscriptionId: string, accessKey: string) {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database.rpc("assign_best_asset", {
    p_access_key: accessKey,
    p_subscription_id: subscriptionId,
  });

  if (error) {
    throw error;
  }

  return data as string | null;
}

export async function applySubscriptionStatus(subscriptionId: string) {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database.rpc("apply_subscription_status", {
    p_subscription_id: subscriptionId,
  });

  if (error) {
    throw error;
  }

  return data as "active" | "processed" | "expired" | "canceled";
}

export async function activateSubscriptionWithEngine(input: {
  activatedAt?: Date;
  amountOverrideRp?: number;
  cancelReason?: string;
  cdKeyCode?: string;
  packageId?: string;
  source: "payment_dummy" | "cdkey" | "admin_manual";
  userId: string;
}): Promise<ActivationResult> {
  const database = createSubscriptionsDatabase();
  const { data, error } = await database.rpc("activate_subscription_v1", {
    p_activated_at: input.activatedAt?.toISOString(),
    p_amount_override_rp: input.amountOverrideRp,
    p_cancel_reason: input.cancelReason,
    p_cd_key_code: input.cdKeyCode,
    p_package_id: input.packageId,
    p_source: input.source,
    p_user_id: input.userId,
  });

  if (error) {
    throw error;
  }

  return activationResultSchema.parse(data);
}
