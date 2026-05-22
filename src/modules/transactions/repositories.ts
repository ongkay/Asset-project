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
  list_amount_rp: number;
  package_discount_amount_rp: number;
  package_id: string;
  package_name: string;
  paid_at: string | null;
  source: TransactionRecord["source"];
  status: TransactionRecord["status"];
  subscription_id: string | null;
  user_id: string;
  voucher_code: string | null;
  voucher_discount_amount_rp: number;
  voucher_discount_percent: number | null;
  voucher_id: string | null;
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
  const pricingSnapshot = input.pricingSnapshot;
  const finalAmountRp = Math.max(0, input.packageSnapshot.amountRp - (pricingSnapshot?.voucherDiscountAmountRp ?? 0));
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("transactions")
    .insert([
      {
        amount_rp: finalAmountRp,
        cd_key_id: input.cdKeyId ?? null,
        code: createTransactionCode(),
        failure_reason: null,
        list_amount_rp: pricingSnapshot?.listAmountRp ?? input.packageSnapshot.amountRp,
        package_discount_amount_rp: pricingSnapshot?.packageDiscountAmountRp ?? 0,
        package_id: input.packageSnapshot.packageId,
        package_name: input.packageSnapshot.name,
        paid_at: null,
        source: input.source,
        status: "pending",
        subscription_id: input.subscriptionId ?? null,
        user_id: input.userId,
        voucher_code: pricingSnapshot?.voucherCode ?? null,
        voucher_discount_amount_rp: pricingSnapshot?.voucherDiscountAmountRp ?? 0,
        voucher_discount_percent: pricingSnapshot?.voucherDiscountPercent ?? null,
        voucher_id: pricingSnapshot?.voucherId ?? null,
      },
    ])
    .select(
      "id, code, user_id, subscription_id, package_id, package_name, source, status, amount_rp, list_amount_rp, package_discount_amount_rp, voucher_id, voucher_code, voucher_discount_percent, voucher_discount_amount_rp, paid_at, failure_reason, created_at",
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
    listAmountRp: data.list_amount_rp,
    packageDiscountAmountRp: data.package_discount_amount_rp,
    packageId: data.package_id,
    packageName: data.package_name,
    paidAt: data.paid_at,
    source: data.source,
    status: data.status,
    subscriptionId: data.subscription_id,
    userId: data.user_id,
    voucherCode: data.voucher_code,
    voucherDiscountAmountRp: data.voucher_discount_amount_rp,
    voucherDiscountPercent: data.voucher_discount_percent,
    voucherId: data.voucher_id,
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
