import "server-only";

import { randomUUID } from "node:crypto";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type {
  CreateTransactionInput,
  SaveTransactionPaymentInvoiceDataInput,
  TransactionRecord,
  UpdateTransactionPaymentStateInput,
} from "./types";

type TransactionRow = {
  amount_rp: number;
  code: string;
  created_at: string;
  failure_reason: string | null;
  id: string;
  list_amount_rp: number;
  payment_fee_amount_rp: number | null;
  payment_fulfillment_status: TransactionRecord["paymentFulfillmentStatus"];
  payment_provider: TransactionRecord["paymentProvider"];
  payment_provider_status: TransactionRecord["paymentProviderStatus"];
  payment_received_at: string | null;
  package_discount_amount_rp: number;
  package_id: string;
  package_name: string;
  paid_at: string | null;
  provider_expired_at: string | null;
  provider_invoice_id: string | null;
  provider_payment_url: string | null;
  provider_payload_json: unknown | null;
  qris_string: string | null;
  source: TransactionRecord["source"];
  status: TransactionRecord["status"];
  subscription_id: string | null;
  user_id: string;
  voucher_code: string | null;
  voucher_discount_amount_rp: number;
  voucher_discount_percent: number | null;
  voucher_id: string | null;
};

const TRANSACTION_SELECT =
  "id, code, user_id, subscription_id, package_id, package_name, source, status, amount_rp, list_amount_rp, package_discount_amount_rp, voucher_id, voucher_code, voucher_discount_percent, voucher_discount_amount_rp, payment_provider, payment_provider_status, payment_fulfillment_status, provider_invoice_id, provider_expired_at, provider_payment_url, qris_string, payment_fee_amount_rp, payment_received_at, provider_payload_json, paid_at, failure_reason, created_at";

function createTransactionCode() {
  return `TRX-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function mapTransactionRow(data: TransactionRow): TransactionRecord {
  return {
    amountRp: data.amount_rp,
    code: data.code,
    createdAt: data.created_at,
    failureReason: data.failure_reason,
    id: data.id,
    listAmountRp: data.list_amount_rp,
    paymentFeeAmountRp: data.payment_fee_amount_rp,
    paymentFulfillmentStatus: data.payment_fulfillment_status,
    paymentProvider: data.payment_provider,
    paymentProviderStatus: data.payment_provider_status,
    paymentReceivedAt: data.payment_received_at,
    packageDiscountAmountRp: data.package_discount_amount_rp,
    packageId: data.package_id,
    packageName: data.package_name,
    paidAt: data.paid_at,
    providerExpiredAt: data.provider_expired_at,
    providerInvoiceId: data.provider_invoice_id,
    providerPaymentUrl: data.provider_payment_url,
    providerPayloadJson: data.provider_payload_json,
    qrisString: data.qris_string,
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
  const paymentProvider = input.paymentProvider ?? null;
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
        payment_fee_amount_rp: null,
        payment_fulfillment_status: paymentProvider ? "not_started" : null,
        payment_provider: paymentProvider,
        payment_provider_status: paymentProvider ? "pending" : null,
        payment_received_at: null,
        package_discount_amount_rp: pricingSnapshot?.packageDiscountAmountRp ?? 0,
        package_id: input.packageSnapshot.packageId,
        package_name: input.packageSnapshot.name,
        paid_at: null,
        provider_expired_at: null,
        provider_invoice_id: null,
        provider_payment_url: null,
        provider_payload_json: null,
        qris_string: null,
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
    .select(TRANSACTION_SELECT)
    .single<TransactionRow>();

  if (error) {
    throw error;
  }

  return mapTransactionRow(data);
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

export async function saveTransactionPaymentInvoiceData(
  input: SaveTransactionPaymentInvoiceDataInput,
): Promise<TransactionRecord> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("transactions")
    .update({
      amount_rp: input.amountRp,
      payment_fee_amount_rp: input.paymentFeeAmountRp,
      payment_fulfillment_status: "not_started",
      payment_provider: input.paymentProvider,
      payment_provider_status: input.paymentProviderStatus,
      provider_expired_at: input.providerExpiredAt,
      provider_invoice_id: input.providerInvoiceId,
      provider_payment_url: input.providerPaymentUrl,
      provider_payload_json: input.providerPayloadJson,
      qris_string: input.qrisString,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId)
    .eq("status", "pending")
    .select(TRANSACTION_SELECT)
    .maybeSingle<TransactionRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Transaction is missing or already finalized.");
  }

  return mapTransactionRow(data);
}

export async function updateTransactionPaymentState(
  input: UpdateTransactionPaymentStateInput,
): Promise<TransactionRecord> {
  const database = createInsForgeAdminDatabase();
  let query = database
    .from("transactions")
    .update({
      ...(typeof input.amountRp === "number" ? { amount_rp: input.amountRp } : {}),
      ...(input.failureReason !== undefined ? { failure_reason: input.failureReason } : {}),
      ...(input.paymentReceivedAt !== undefined ? { payment_received_at: input.paymentReceivedAt } : {}),
      ...(input.providerPayloadJson !== undefined ? { provider_payload_json: input.providerPayloadJson } : {}),
      ...(input.status ? { status: input.status } : {}),
      payment_provider_status: input.paymentProviderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId);

  const shouldProtectCanceledState = input.status !== "canceled" && input.paymentProviderStatus !== "canceled";

  if (shouldProtectCanceledState) {
    query = query.neq("status", "canceled").neq("payment_provider_status", "canceled");
  }

  const { data, error } = await query.select(TRANSACTION_SELECT).maybeSingle<TransactionRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Transaction is missing.");
  }

  return mapTransactionRow(data);
}

export async function claimTransactionPaymentFulfillment(transactionId: string): Promise<boolean> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("transactions")
    .update({
      failure_reason: null,
      payment_fulfillment_status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .eq("source", "payment_qris")
    .eq("status", "pending")
    .eq("payment_provider_status", "paid")
    .in("payment_fulfillment_status", ["not_started", "failed"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

export async function markTransactionPaymentFulfillmentFailed(input: {
  failureReason: string;
  transactionId: string;
}): Promise<void> {
  const database = createInsForgeAdminDatabase();
  const { error } = await database
    .from("transactions")
    .update({
      failure_reason: input.failureReason,
      payment_fulfillment_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId)
    .eq("source", "payment_qris")
    .eq("status", "pending");

  if (error) {
    throw error;
  }
}

export async function markTransactionPaymentFulfilled(input: {
  paidAt: string;
  paymentReceivedAt: string | null;
  transactionId: string;
}): Promise<void> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("transactions")
    .update({
      failure_reason: null,
      paid_at: input.paidAt,
      payment_fulfillment_status: "fulfilled",
      payment_received_at: input.paymentReceivedAt,
      status: "success",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId)
    .eq("source", "payment_qris")
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Transaction is missing or already finalized.");
  }
}
