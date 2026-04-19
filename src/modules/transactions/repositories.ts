import "server-only";

import { randomUUID } from "node:crypto";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type { CreateTransactionInput, TransactionRecord } from "./types";

type TransactionRow = {
  amount_rp: number;
  code: string;
  created_at: string;
  failure_reason: string | null;
  id: string;
  package_id: string;
  package_name: string;
  paid_at: string | null;
  source: TransactionRecord["source"];
  status: TransactionRecord["status"];
  subscription_id: string | null;
  user_id: string;
};

function createTransactionCode() {
  return `TRX-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

async function updateTransactionStatus(input: {
  failureReason: string | null;
  paidAt: string | null;
  status: TransactionRecord["status"];
  transactionId: string;
}): Promise<void> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("transactions")
    .update({
      failure_reason: input.failureReason,
      paid_at: input.paidAt,
      status: input.status,
    })
    .eq("id", input.transactionId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Transaction is missing or already finalized.");
  }
}

export async function insertTransaction(input: CreateTransactionInput): Promise<TransactionRecord> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("transactions")
    .insert([
      {
        amount_rp: input.amountRp,
        cd_key_id: input.cdKeyId ?? null,
        code: createTransactionCode(),
        failure_reason: null,
        package_id: input.packageId,
        package_name: input.packageName,
        paid_at: null,
        source: input.source,
        status: "pending",
        subscription_id: input.subscriptionId ?? null,
        user_id: input.userId,
      },
    ])
    .select(
      "id, code, user_id, subscription_id, package_id, package_name, source, status, amount_rp, paid_at, failure_reason, created_at",
    )
    .single<TransactionRow>();

  if (error) {
    throw error;
  }

  return {
    amountRp: data.amount_rp,
    code: data.code,
    createdAt: data.created_at,
    failureReason: data.failure_reason,
    id: data.id,
    packageId: data.package_id,
    packageName: data.package_name,
    paidAt: data.paid_at,
    source: data.source,
    status: data.status,
    subscriptionId: data.subscription_id,
    userId: data.user_id,
  };
}

export async function linkTransactionToSubscription(transactionId: string, subscriptionId: string): Promise<void> {
  const database = createInsForgeAdminDatabase();
  const { error } = await database
    .from("transactions")
    .update({ subscription_id: subscriptionId })
    .eq("id", transactionId);

  if (error) {
    throw error;
  }
}

export async function markTransactionAsSucceeded(transactionId: string, paidAt: string): Promise<void> {
  await updateTransactionStatus({
    failureReason: null,
    paidAt,
    status: "success",
    transactionId,
  });
}

export async function markTransactionAsFailed(transactionId: string, failureReason: string): Promise<void> {
  await updateTransactionStatus({
    failureReason,
    paidAt: null,
    status: "failed",
    transactionId,
  });
}

export async function markTransactionAsCanceled(transactionId: string, failureReason: string): Promise<void> {
  await updateTransactionStatus({
    failureReason,
    paidAt: null,
    status: "canceled",
    transactionId,
  });
}
