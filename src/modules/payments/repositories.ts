import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type { TransactionRecord } from "@/modules/transactions/types";
import type { PaymentReconcileCandidate } from "./types";

const canonicalUuidLikeSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

const paymentTransactionRepositoryRowSchema = z.object({
  amount_rp: z.number().int().nonnegative(),
  code: z.string().min(1),
  created_at: z.string().min(1),
  failure_reason: z.string().nullable(),
  id: canonicalUuidLikeSchema,
  list_amount_rp: z.number().int().nonnegative(),
  package_discount_amount_rp: z.number().int().nonnegative(),
  package_id: canonicalUuidLikeSchema,
  package_name: z.string().min(1),
  paid_at: z.string().nullable(),
  payment_fee_amount_rp: z.number().int().nonnegative().nullable(),
  payment_fulfillment_status: z.enum(["not_started", "processing", "fulfilled", "failed"]).nullable(),
  payment_provider: z.enum(["invoiceku"]).nullable(),
  payment_provider_status: z.enum(["pending", "paid", "failed", "canceled", "expired"]).nullable(),
  payment_received_at: z.string().nullable(),
  provider_expired_at: z.string().nullable(),
  provider_invoice_id: z.string().nullable(),
  provider_payment_url: z.string().nullable(),
  provider_payload_json: z.unknown().nullable(),
  qris_string: z.string().nullable(),
  source: z.enum(["payment_dummy", "payment_qris", "cdkey", "admin_manual"]),
  status: z.enum(["pending", "success", "failed", "canceled"]),
  subscription_id: canonicalUuidLikeSchema.nullable(),
  user_id: canonicalUuidLikeSchema,
  voucher_code: z.string().nullable(),
  voucher_discount_amount_rp: z.number().int().nonnegative(),
  voucher_discount_percent: z.number().int().min(1).max(100).nullable(),
  voucher_id: canonicalUuidLikeSchema.nullable(),
});

type PaymentTransactionRepositoryRow = z.infer<typeof paymentTransactionRepositoryRowSchema>;

const PAYMENT_TRANSACTION_SELECT =
  "id, code, user_id, subscription_id, package_id, package_name, source, status, amount_rp, list_amount_rp, package_discount_amount_rp, voucher_id, voucher_code, voucher_discount_percent, voucher_discount_amount_rp, payment_provider, payment_provider_status, payment_fulfillment_status, provider_invoice_id, provider_expired_at, provider_payment_url, qris_string, payment_fee_amount_rp, payment_received_at, provider_payload_json, paid_at, failure_reason, created_at";

function createPaymentsRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

function parseTransactionRows(rows: unknown) {
  if (!Array.isArray(rows)) {
    return [] satisfies PaymentTransactionRepositoryRow[];
  }

  return z.array(paymentTransactionRepositoryRowSchema).parse(rows);
}

function mapTransactionRow(row: PaymentTransactionRepositoryRow): TransactionRecord {
  return {
    amountRp: row.amount_rp,
    code: row.code,
    createdAt: row.created_at,
    failureReason: row.failure_reason,
    id: row.id,
    listAmountRp: row.list_amount_rp,
    paymentFeeAmountRp: row.payment_fee_amount_rp,
    paymentFulfillmentStatus: row.payment_fulfillment_status,
    paymentProvider: row.payment_provider,
    paymentProviderStatus: row.payment_provider_status,
    paymentReceivedAt: row.payment_received_at,
    packageDiscountAmountRp: row.package_discount_amount_rp,
    packageId: row.package_id,
    packageName: row.package_name,
    paidAt: row.paid_at,
    providerExpiredAt: row.provider_expired_at,
    providerInvoiceId: row.provider_invoice_id,
    providerPaymentUrl: row.provider_payment_url,
    providerPayloadJson: row.provider_payload_json,
    qrisString: row.qris_string,
    source: row.source,
    status: row.status,
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    voucherCode: row.voucher_code,
    voucherDiscountAmountRp: row.voucher_discount_amount_rp,
    voucherDiscountPercent: row.voucher_discount_percent,
    voucherId: row.voucher_id,
  };
}

export async function readPaymentTransactionById(transactionId: string) {
  const database = createPaymentsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .select(PAYMENT_TRANSACTION_SELECT)
    .eq("id", transactionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapTransactionRow(paymentTransactionRepositoryRowSchema.parse(data));
}

export async function readPaymentTransactionByIdForOwner(input: { transactionId: string; userId: string }) {
  const database = createPaymentsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .select(PAYMENT_TRANSACTION_SELECT)
    .eq("id", input.transactionId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapTransactionRow(paymentTransactionRepositoryRowSchema.parse(data));
}

export async function listReusablePendingQrisTransactions(input: { packageId: string; userId: string }) {
  const database = createPaymentsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .select(PAYMENT_TRANSACTION_SELECT)
    .eq("user_id", input.userId)
    .eq("package_id", input.packageId)
    .eq("source", "payment_qris")
    .eq("status", "pending")
    .eq("payment_provider", "invoiceku")
    .eq("payment_provider_status", "pending")
    .not("provider_invoice_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return parseTransactionRows(data).map((row) => mapTransactionRow(row));
}

export async function listQrisTransactionsForReconcile(limit = 100): Promise<PaymentReconcileCandidate[]> {
  const database = createPaymentsRepositoryDatabase();
  const { data, error } = await database
    .from("transactions")
    .select("id, provider_invoice_id, provider_expired_at, payment_provider_status, payment_fulfillment_status")
    .eq("source", "payment_qris")
    .eq("payment_provider", "invoiceku")
    .eq("status", "pending")
    .not("provider_invoice_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  const parsedRows = z
    .array(
      z.object({
        id: canonicalUuidLikeSchema,
        payment_fulfillment_status: z.enum(["not_started", "processing", "fulfilled", "failed"]).nullable(),
        payment_provider_status: z.enum(["pending", "paid", "failed", "canceled", "expired"]).nullable(),
        provider_expired_at: z.string().nullable(),
        provider_invoice_id: z.string().min(1),
      }),
    )
    .parse(Array.isArray(data) ? data : []);

  return parsedRows.map((row) => ({
    fulfillmentStatus: row.payment_fulfillment_status,
    paymentProviderStatus: row.payment_provider_status,
    providerExpiredAt: row.provider_expired_at,
    providerInvoiceId: row.provider_invoice_id,
    transactionId: row.id,
  }));
}
