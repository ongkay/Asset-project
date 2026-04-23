import "server-only";

import { z } from "zod";

import { readProfileByUserId } from "@/modules/auth/repositories";
import { validateActiveAppSession } from "@/modules/sessions/services";

import {
  readConsoleAssetDetailByUserId,
  readConsoleSnapshotByUserId,
  readLatestConsoleSubscriptionByUserId,
} from "./repositories";
import type { ConsoleAssetDetail, ConsoleSnapshot, ConsoleStateSnapshot } from "./types";

const isoDateTimeSchema = z.iso.datetime({ offset: true });
const canonicalUuidLikeSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

const consoleSubscriptionSchema = z.object({
  days_left: z.number().int().nonnegative(),
  end_at: isoDateTimeSchema,
  id: z.uuid(),
  package_id: z.uuid(),
  package_name: z.string(),
  start_at: isoDateTimeSchema,
  status: z.enum(["active", "processed"]),
});

const consoleAssetSchema = z.object({
  access_key: z.string(),
  asset_type: z.enum(["private", "share"]),
  assignment_id: z.uuid(),
  expires_at: isoDateTimeSchema,
  id: z.string().min(1),
  note: z.string().nullable(),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  proxy: z.string().nullable(),
  subscription_id: z.uuid(),
});

const consoleTransactionSchema = z.object({
  amount_rp: z.number().int().nonnegative(),
  created_at: isoDateTimeSchema,
  id: canonicalUuidLikeSchema,
  package_id: z.uuid(),
  package_name: z.string(),
  paid_at: isoDateTimeSchema.nullable(),
  source: z.enum(["payment_dummy", "cdkey", "admin_manual"]),
  status: z.enum(["pending", "success", "failed", "canceled"]),
});

const consoleSnapshotSchema = z.object({
  assets: z.array(consoleAssetSchema),
  subscription: consoleSubscriptionSchema.nullable(),
  transactions: z.array(consoleTransactionSchema),
});

const consoleAssetDetailSchema = z.object({
  access_key: z.string(),
  account: z.string(),
  asset_json: z.unknown(),
  asset_type: z.enum(["private", "share"]),
  expires_at: isoDateTimeSchema,
  id: z.string().min(1),
  note: z.string().nullable(),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  proxy: z.string().nullable(),
  subscription_id: canonicalUuidLikeSchema,
});

const consoleStateSubscriptionSchema = z.object({
  created_at: isoDateTimeSchema,
  end_at: isoDateTimeSchema,
  id: canonicalUuidLikeSchema,
  package_id: z.uuid(),
  package_name: z.string(),
  start_at: isoDateTimeSchema,
  status: z.enum(["active", "processed", "expired", "canceled"]),
});

type ConsoleStateSubscriptionRow = {
  endAt: string;
  id: string;
  packageId: string;
  packageName: string;
  startAt: string;
  status: "active" | "processed" | "expired" | "canceled";
};

async function resolveConsoleTargetUserId(input: { userId?: string }) {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const targetUserId = input.userId ?? activeSession.userId;

  if (targetUserId === activeSession.userId) {
    return targetUserId;
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile || profile.role !== "admin") {
    throw new Error("Admin access is required to read another user's console snapshot.");
  }

  return targetUserId;
}

export async function getConsoleSnapshot(input: { userId?: string } = {}): Promise<ConsoleSnapshot> {
  const targetUserId = await resolveConsoleTargetUserId(input);

  if (!targetUserId) {
    return {
      assets: [],
      subscription: null,
      transactions: [],
    };
  }

  const snapshot = consoleSnapshotSchema.parse(await readConsoleSnapshotByUserId(targetUserId));

  return {
    assets: snapshot.assets.map((asset) => ({
      accessKey: asset.access_key,
      assetType: asset.asset_type,
      assignmentId: asset.assignment_id,
      expiresAt: asset.expires_at,
      id: asset.id,
      note: asset.note,
      platform: asset.platform,
      proxy: asset.proxy,
      subscriptionId: asset.subscription_id,
    })),
    subscription: snapshot.subscription
      ? {
          daysLeft: snapshot.subscription.days_left,
          endAt: snapshot.subscription.end_at,
          id: snapshot.subscription.id,
          packageId: snapshot.subscription.package_id,
          packageName: snapshot.subscription.package_name,
          startAt: snapshot.subscription.start_at,
          status: snapshot.subscription.status,
        }
      : null,
    transactions: snapshot.transactions.map((transaction) => ({
      amountRp: transaction.amount_rp,
      createdAt: transaction.created_at,
      id: transaction.id,
      packageId: transaction.package_id,
      packageName: transaction.package_name,
      paidAt: transaction.paid_at,
      source: transaction.source,
      status: transaction.status,
    })),
  };
}

export async function getConsoleAssetDetail(input: {
  assetId: string;
  userId?: string;
}): Promise<ConsoleAssetDetail | null> {
  if (!z.string().min(1).safeParse(input.assetId).success) {
    return null;
  }

  const targetUserId = await resolveConsoleTargetUserId(input);

  if (!targetUserId) {
    return null;
  }

  const detailRow = await readConsoleAssetDetailByUserId({
    assetId: input.assetId,
    userId: targetUserId,
  });

  if (!detailRow) {
    return null;
  }

  const detail = consoleAssetDetailSchema.parse(detailRow);

  return {
    accessKey: detail.access_key,
    account: detail.account,
    asset: detail.asset_json,
    assetType: detail.asset_type,
    expiresAt: detail.expires_at,
    id: detail.id,
    note: detail.note,
    platform: detail.platform,
    proxy: detail.proxy,
    subscriptionId: detail.subscription_id,
  };
}

export function deriveConsoleStateSnapshot(
  latestSubscription: ConsoleStateSubscriptionRow | null,
  now = new Date(),
): ConsoleStateSnapshot {
  if (!latestSubscription) {
    return {
      latestSubscription: null,
      state: "none",
    };
  }

  const effectiveStatus =
    latestSubscription.status !== "canceled" && new Date(latestSubscription.endAt).getTime() <= now.getTime()
      ? "expired"
      : latestSubscription.status;

  return {
    latestSubscription: {
      endAt: latestSubscription.endAt,
      id: latestSubscription.id,
      packageId: latestSubscription.packageId,
      packageName: latestSubscription.packageName,
      startAt: latestSubscription.startAt,
      status: effectiveStatus,
    },
    state: effectiveStatus,
  };
}

export async function getConsoleStateSnapshot(input: { userId?: string } = {}): Promise<ConsoleStateSnapshot> {
  const targetUserId = await resolveConsoleTargetUserId(input);

  if (!targetUserId) {
    return deriveConsoleStateSnapshot(null);
  }

  const latestSubscriptionRow = await readLatestConsoleSubscriptionByUserId(targetUserId);

  if (!latestSubscriptionRow) {
    return deriveConsoleStateSnapshot(null);
  }

  const latestSubscription = consoleStateSubscriptionSchema.parse(latestSubscriptionRow);

  return deriveConsoleStateSnapshot({
    endAt: latestSubscription.end_at,
    id: latestSubscription.id,
    packageId: latestSubscription.package_id,
    packageName: latestSubscription.package_name,
    startAt: latestSubscription.start_at,
    status: latestSubscription.status,
  });
}
