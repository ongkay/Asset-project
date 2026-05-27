import "server-only";

import { notFound } from "next/navigation";

import { readPaymentTransactionByIdForOwner } from "./repositories";

import type { MemberPaymentPageData, PaymentPageState } from "./types";
import type { TransactionRecord } from "@/modules/transactions/types";

function isExpired(transaction: TransactionRecord, now: Date) {
  if (!transaction.providerExpiredAt) {
    return false;
  }

  return new Date(transaction.providerExpiredAt).getTime() <= now.getTime();
}

export function hasIncompleteQrisInvoiceData(transaction: TransactionRecord) {
  if (transaction.source !== "payment_qris" || transaction.status !== "pending") {
    return false;
  }

  if (
    transaction.paymentProvider !== "invoiceku" ||
    !transaction.paymentProviderStatus ||
    !transaction.providerInvoiceId
  ) {
    return true;
  }

  if (transaction.paymentProviderStatus !== "pending") {
    return false;
  }

  return !transaction.qrisString || !transaction.providerExpiredAt;
}

export function derivePaymentPageState(transaction: TransactionRecord, now: Date = new Date()): PaymentPageState {
  if (transaction.status === "success") {
    return "success";
  }

  if (transaction.status === "canceled" || transaction.paymentProviderStatus === "canceled") {
    return "canceled";
  }

  if (hasIncompleteQrisInvoiceData(transaction)) {
    return "failed";
  }

  if (transaction.paymentProviderStatus === "expired" || isExpired(transaction, now)) {
    return "expired";
  }

  if (transaction.paymentProviderStatus === "paid" && transaction.paymentFulfillmentStatus === "failed") {
    return "processing_failed";
  }

  if (transaction.paymentProviderStatus === "paid") {
    return "processing";
  }

  if (transaction.status === "failed" || transaction.paymentProviderStatus === "failed") {
    return "failed";
  }

  return "pending";
}

export function mapTransactionToPaymentPageData(
  transaction: TransactionRecord,
  now: Date = new Date(),
): MemberPaymentPageData {
  const paymentFeeAmountRp = transaction.paymentFeeAmountRp ?? 0;
  const state = derivePaymentPageState(transaction, now);

  return {
    amountRp: transaction.amountRp,
    amountSubtotalRp: Math.max(0, transaction.amountRp - paymentFeeAmountRp),
    canCancel: state === "pending" && Boolean(transaction.providerInvoiceId),
    canCheckStatus:
      Boolean(transaction.providerInvoiceId) &&
      (state === "pending" || state === "processing" || state === "processing_failed"),
    code: transaction.code,
    createdAt: transaction.createdAt,
    expiresAt: transaction.providerExpiredAt,
    failureReason: transaction.failureReason,
    fulfillmentStatus: transaction.paymentFulfillmentStatus,
    id: transaction.id,
    packageId: transaction.packageId,
    packageName: transaction.packageName,
    paidAt: transaction.paymentReceivedAt ?? transaction.paidAt,
    paymentFeeAmountRp,
    provider: transaction.paymentProvider,
    providerInvoiceId: transaction.providerInvoiceId,
    providerPaymentUrl: transaction.providerPaymentUrl,
    providerStatus: transaction.paymentProviderStatus,
    qrisString: transaction.qrisString,
    state,
    status: transaction.status,
    voucherCode: transaction.voucherCode,
    voucherDiscountAmountRp: transaction.voucherDiscountAmountRp,
  };
}

export async function getMemberPaymentPageData(input: { transactionId: string; userId: string }) {
  const transaction = await readPaymentTransactionByIdForOwner(input);

  if (!transaction || transaction.source !== "payment_qris") {
    notFound();
  }

  return mapTransactionToPaymentPageData(transaction);
}
