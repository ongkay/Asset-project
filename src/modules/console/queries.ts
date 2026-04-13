import "server-only";

import { z } from "zod";

import { createInsForgeServerDatabase } from "@/lib/insforge/database";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { validateActiveAppSession } from "@/modules/sessions/services";

import type { ConsoleAssetDetail, ConsoleSnapshot } from "./types";

const consoleSubscriptionSchema = z.object({
  days_left: z.number().int().nonnegative(),
  end_at: z.iso.datetime(),
  id: z.uuid(),
  package_id: z.uuid(),
  package_name: z.string(),
  start_at: z.iso.datetime(),
  status: z.enum(["active", "processed"]),
});

const consoleAssetSchema = z.object({
  access_key: z.string(),
  asset_type: z.enum(["private", "share"]),
  assignment_id: z.uuid(),
  expires_at: z.iso.datetime(),
  id: z.uuid(),
  note: z.string().nullable(),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  proxy: z.string().nullable(),
  subscription_id: z.uuid(),
});

const consoleTransactionSchema = z.object({
  amount_rp: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
  id: z.uuid(),
  package_id: z.uuid(),
  package_name: z.string(),
  paid_at: z.iso.datetime().nullable(),
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
  expires_at: z.iso.datetime(),
  id: z.uuid(),
  note: z.string().nullable(),
  platform: z.enum(["tradingview", "fxreplay", "fxtester"]),
  proxy: z.string().nullable(),
  subscription_id: z.uuid(),
});

function createConsoleDatabase() {
  return createInsForgeServerDatabase();
}

async function resolveConsoleTargetUserId(input: { userId?: string }) {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    throw new Error("An active app session is required.");
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
  const database = createConsoleDatabase();
  const targetUserId = await resolveConsoleTargetUserId(input);
  const { data, error } = await database.rpc("get_user_console_snapshot", {
    p_user_id: targetUserId,
  });

  if (error) {
    throw error;
  }

  const snapshot = consoleSnapshotSchema.parse(data);

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
  const database = createConsoleDatabase();
  const targetUserId = await resolveConsoleTargetUserId(input);
  const { data, error } = await database.rpc("get_user_asset_detail", {
    p_asset_id: input.assetId,
    p_user_id: targetUserId,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const detail = consoleAssetDetailSchema.parse(data);

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
