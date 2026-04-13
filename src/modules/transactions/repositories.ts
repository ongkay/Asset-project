import "server-only";

import { randomUUID } from "node:crypto";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type { CreateTransactionInput, TransactionRecord } from "./types";

type TransactionRow = {
  amount_rp: number;
  code: string;
  created_at: string;
  id: string;
  package_id: string;
  package_name: string;
  source: TransactionRecord["source"];
  status: TransactionRecord["status"];
  subscription_id: string | null;
  user_id: string;
};

function createTransactionCode() {
  return `TRX-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
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
        package_id: input.packageId,
        package_name: input.packageName,
        paid_at: input.status === "success" ? new Date().toISOString() : null,
        source: input.source,
        status: input.status,
        subscription_id: input.subscriptionId ?? null,
        user_id: input.userId,
      },
    ])
    .select("id, code, user_id, subscription_id, package_id, package_name, source, status, amount_rp, created_at")
    .single<TransactionRow>();

  if (error) {
    throw error;
  }

  return {
    amountRp: data.amount_rp,
    code: data.code,
    createdAt: data.created_at,
    id: data.id,
    packageId: data.package_id,
    packageName: data.package_name,
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
