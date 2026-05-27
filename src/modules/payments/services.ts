import "server-only";

import { createInvoice, cancelInvoiceById, getInvoiceById, InvoiceKuProviderError } from "@/lib/payments/invoiceku";
import { getPackageById as getSubscriptionPackageById } from "@/modules/subscriptions/repositories";
import { fulfillPaidSubscriptionPurchase } from "@/modules/subscriptions/services";
import {
  claimPaidTransactionFulfillment,
  createTransaction,
  failTransaction,
  failTransactionPaymentFulfillment,
  fulfillTransactionPayment,
  refreshTransactionPaymentState,
  saveTransactionInvoiceData,
} from "@/modules/transactions/services";

import { createQrisPaymentForCheckoutSchema } from "./schemas";
import {
  PAYMENT_BACKEND_NOT_READY_MESSAGE,
  PAYMENT_INVOICE_INVALID_MESSAGE,
  PAYMENT_NOT_FOUND_MESSAGE,
  PAYMENT_NOT_PENDING_MESSAGE,
  getPaymentRuntimeFailureReason,
  isPaymentBackendNotReadyError,
  mapPaymentFailure,
  toCreatePaymentFailure,
  toPaymentActionFailure,
} from "./error-utils";
import {
  listQrisTransactionsForReconcile,
  listReusablePendingQrisTransactions,
  readPaymentTransactionById,
  readPaymentTransactionByIdForOwner,
} from "./repositories";
import { hasIncompleteQrisInvoiceData, mapTransactionToPaymentPageData } from "./queries";

import type {
  CreateQrisPaymentForCheckoutInput,
  CreateQrisPaymentForCheckoutResult,
  MemberPaymentPageData,
  PaymentActionResult,
  PaymentCronJobResult,
} from "./types";

function isReusableCheckoutTransaction(input: {
  now: Date;
  pricingSnapshot: CreateQrisPaymentForCheckoutInput["pricingSnapshot"];
  transaction: Awaited<ReturnType<typeof readPaymentTransactionById>> extends infer TTransaction
    ? TTransaction extends null
      ? never
      : NonNullable<TTransaction>
    : never;
}) {
  return (
    input.transaction.paymentProvider === "invoiceku" &&
    input.transaction.paymentProviderStatus === "pending" &&
    input.transaction.status === "pending" &&
    Boolean(input.transaction.providerInvoiceId) &&
    Boolean(input.transaction.qrisString) &&
    Boolean(input.transaction.providerExpiredAt) &&
    new Date(input.transaction.providerExpiredAt!).getTime() > input.now.getTime() &&
    input.transaction.listAmountRp === input.pricingSnapshot.listAmountRp &&
    input.transaction.packageDiscountAmountRp === input.pricingSnapshot.packageDiscountAmountRp &&
    input.transaction.voucherId === (input.pricingSnapshot.voucherId ?? null) &&
    input.transaction.voucherCode === (input.pricingSnapshot.voucherCode ?? null) &&
    input.transaction.voucherDiscountAmountRp === (input.pricingSnapshot.voucherDiscountAmountRp ?? 0) &&
    input.transaction.voucherDiscountPercent === (input.pricingSnapshot.voucherDiscountPercent ?? null)
  );
}

function buildPaymentRoute(transactionId: string) {
  return `/payment/${transactionId}` as const;
}

async function readOwnedPaymentOrError(input: { transactionId: string; userId: string }) {
  const transaction = await readPaymentTransactionByIdForOwner(input);

  if (!transaction || transaction.source !== "payment_qris") {
    return {
      errorCode: "payment-not-found",
      message: PAYMENT_NOT_FOUND_MESSAGE,
      ok: false,
      payment: null,
    } satisfies PaymentActionResult;
  }

  return transaction;
}

function buildActionSuccessResult(message: string | null, payment: MemberPaymentPageData) {
  return {
    message,
    ok: true,
    payment,
  } satisfies PaymentActionResult;
}

function buildActionFailureResult(input: {
  errorCode: Extract<PaymentActionResult, { ok: false }>["errorCode"];
  message: string;
  payment: MemberPaymentPageData | null;
}): Extract<PaymentActionResult, { ok: false }> {
  return {
    errorCode: input.errorCode,
    message: input.message,
    ok: false,
    payment: input.payment,
  };
}

async function isMemberCanceledTransaction(transactionId: string) {
  const latestTransaction = await readPaymentTransactionById(transactionId);

  if (!latestTransaction || latestTransaction.source !== "payment_qris") {
    return false;
  }

  return (
    latestTransaction.status === "canceled" ||
    latestTransaction.paymentProviderStatus === "canceled" ||
    latestTransaction.failureReason === "member_canceled"
  );
}

export async function createQrisPaymentForCheckout(
  input: CreateQrisPaymentForCheckoutInput,
): Promise<CreateQrisPaymentForCheckoutResult> {
  const parsedInput = createQrisPaymentForCheckoutSchema.parse(input);
  const now = new Date();
  const reusableTransactions = await listReusablePendingQrisTransactions({
    packageId: parsedInput.packageSnapshot.packageId,
    userId: parsedInput.userId,
  });
  const reusableTransaction = reusableTransactions.find((transaction) =>
    isReusableCheckoutTransaction({
      now,
      pricingSnapshot: parsedInput.pricingSnapshot,
      transaction,
    }),
  );

  if (reusableTransaction) {
    return {
      ok: true,
      redirectTo: buildPaymentRoute(reusableTransaction.id),
      transactionId: reusableTransaction.id,
    };
  }

  let transaction: Awaited<ReturnType<typeof createTransaction>>;

  try {
    transaction = await createTransaction({
      packageSnapshot: {
        amountRp: parsedInput.packageSnapshot.amountRp,
        packageId: parsedInput.packageSnapshot.packageId,
        name: parsedInput.packageSnapshot.name,
      },
      paymentProvider: "invoiceku",
      pricingSnapshot: parsedInput.pricingSnapshot,
      source: "payment_qris",
      userId: parsedInput.userId,
    });
  } catch (error) {
    return toCreatePaymentFailure(error);
  }

  try {
    const quoteAmountRp = Math.max(
      0,
      parsedInput.packageSnapshot.amountRp - (parsedInput.pricingSnapshot.voucherDiscountAmountRp ?? 0),
    );
    const providerInvoice = await createInvoice({
      amount: quoteAmountRp,
      customerEmail: parsedInput.customerEmail,
      customerName: parsedInput.customerName,
      itemName: parsedInput.packageSnapshot.name,
    });

    const savedTransaction = await saveTransactionInvoiceData({
      amountRp: providerInvoice.amountTotal,
      paymentFeeAmountRp: Math.max(0, providerInvoice.amountTotal - providerInvoice.amountOriginal),
      paymentProvider: "invoiceku",
      paymentProviderStatus: providerInvoice.providerStatus,
      providerExpiredAt: providerInvoice.expiredAt,
      providerInvoiceId: providerInvoice.invoiceId,
      providerPayloadJson: providerInvoice.raw,
      providerPaymentUrl: providerInvoice.paymentUrl,
      qrisString: providerInvoice.qrisString,
      transactionId: transaction.id,
    });

    if (hasIncompleteQrisInvoiceData(savedTransaction)) {
      throw new Error("Provider invoice data is incomplete after save.");
    }

    return {
      ok: true,
      redirectTo: buildPaymentRoute(transaction.id),
      transactionId: transaction.id,
    };
  } catch (error) {
    const paymentFailure = mapPaymentFailure(error);

    try {
      await failTransaction({
        failureReason: getPaymentRuntimeFailureReason(error),
        transactionId: transaction.id,
      });
    } catch {
      return {
        errorCode: "payment-backend-not-ready",
        message: PAYMENT_BACKEND_NOT_READY_MESSAGE,
        ok: false,
      };
    }

    return {
      errorCode: paymentFailure.errorCode,
      message: paymentFailure.message,
      ok: false,
    };
  }
}

export async function finalizePaidQrisTransaction(transactionId: string) {
  const currentTransaction = await readPaymentTransactionById(transactionId);

  if (!currentTransaction || currentTransaction.source !== "payment_qris") {
    return null;
  }

  if (currentTransaction.status === "success" && currentTransaction.paymentFulfillmentStatus === "fulfilled") {
    return currentTransaction;
  }

  const didClaim = await claimPaidTransactionFulfillment(transactionId);

  if (!didClaim) {
    return readPaymentTransactionById(transactionId);
  }

  try {
    const packageSnapshot = await getSubscriptionPackageById(currentTransaction.packageId);

    if (!packageSnapshot) {
      throw new Error("Package snapshot untuk fulfillment tidak ditemukan.");
    }

    const paymentReceivedAt = currentTransaction.paymentReceivedAt ?? new Date().toISOString();
    await fulfillPaidSubscriptionPurchase({
      durationDays: packageSnapshot.durationDays,
      packageSnapshot,
      pricingSnapshot: {
        listAmountRp: currentTransaction.listAmountRp,
        packageDiscountAmountRp: currentTransaction.packageDiscountAmountRp,
        voucherCode: currentTransaction.voucherCode,
        voucherDiscountAmountRp: currentTransaction.voucherDiscountAmountRp,
        voucherDiscountPercent: currentTransaction.voucherDiscountPercent,
        voucherId: currentTransaction.voucherId,
      },
      source: "payment_qris",
      transactionId,
      userId: currentTransaction.userId,
    });
    await fulfillTransactionPayment({
      paidAt: paymentReceivedAt,
      paymentReceivedAt,
      transactionId,
    });
  } catch (error) {
    await failTransactionPaymentFulfillment({
      failureReason: getPaymentRuntimeFailureReason(error),
      transactionId,
    });
  }

  return readPaymentTransactionById(transactionId);
}

export async function checkMemberQrisPaymentStatus(input: {
  transactionId: string;
  userId: string;
}): Promise<PaymentActionResult> {
  const ownedPayment = await readOwnedPaymentOrError(input);

  if ("ok" in ownedPayment) {
    return ownedPayment;
  }

  const currentPayment = mapTransactionToPaymentPageData(ownedPayment);

  if (currentPayment.state === "canceled") {
    return buildActionSuccessResult("Transaksi ini sudah dibatalkan.", currentPayment);
  }

  if (ownedPayment.status === "success") {
    return buildActionSuccessResult("Pembayaran sudah berhasil diproses.", currentPayment);
  }

  if (hasIncompleteQrisInvoiceData(ownedPayment)) {
    return buildActionFailureResult({
      errorCode: "provider-invalid-response",
      message: PAYMENT_INVOICE_INVALID_MESSAGE,
      payment: currentPayment,
    });
  }

  if (!ownedPayment.providerInvoiceId) {
    return buildActionFailureResult({
      errorCode: "provider-invalid-response",
      message: PAYMENT_INVOICE_INVALID_MESSAGE,
      payment: currentPayment,
    });
  }

  try {
    const providerInvoice = await getInvoiceById(ownedPayment.providerInvoiceId);

    if (providerInvoice.providerStatus === "paid") {
      await refreshTransactionPaymentState({
        amountRp: providerInvoice.amountTotal,
        failureReason: null,
        paymentProviderStatus: "paid",
        paymentReceivedAt: providerInvoice.paidAt,
        providerPayloadJson: providerInvoice.raw,
        transactionId: ownedPayment.id,
      });
      const finalizedTransaction = await finalizePaidQrisTransaction(ownedPayment.id);
      const finalizedPayment = finalizedTransaction ? mapTransactionToPaymentPageData(finalizedTransaction) : null;

      if (!finalizedPayment) {
        return buildActionFailureResult({
          errorCode: "payment-not-found",
          message: PAYMENT_NOT_FOUND_MESSAGE,
          payment: null,
        });
      }

      if (finalizedPayment.state === "processing_failed") {
        return buildActionFailureResult({
          errorCode: "checkout-failed",
          message:
            "Pembayaran sudah diterima, tetapi aktivasi akses Anda belum selesai. Silakan cek lagi beberapa saat lagi.",
          payment: finalizedPayment,
        });
      }

      return buildActionSuccessResult(
        finalizedPayment.state === "success"
          ? "Pembayaran berhasil dikonfirmasi."
          : "Pembayaran sudah diterima dan sedang diproses.",
        finalizedPayment,
      );
    }

    if (providerInvoice.providerStatus === "failed") {
      if (await isMemberCanceledTransaction(ownedPayment.id)) {
        const canceledTransaction = await refreshTransactionPaymentState({
          failureReason: "member_canceled",
          paymentProviderStatus: "canceled",
          providerPayloadJson: providerInvoice.raw,
          status: "canceled",
          transactionId: ownedPayment.id,
        });

        return buildActionSuccessResult(
          "Transaksi berhasil dibatalkan.",
          mapTransactionToPaymentPageData(canceledTransaction),
        );
      }

      const failedTransaction = await refreshTransactionPaymentState({
        failureReason: "payment_failed",
        paymentProviderStatus: "failed",
        providerPayloadJson: providerInvoice.raw,
        status: "failed",
        transactionId: ownedPayment.id,
      });

      return buildActionFailureResult({
        errorCode: "checkout-failed",
        message: "Pembayaran dinyatakan gagal oleh provider.",
        payment: mapTransactionToPaymentPageData(failedTransaction),
      });
    }

    if (providerInvoice.providerStatus === "expired") {
      const expiredTransaction = await refreshTransactionPaymentState({
        failureReason: "payment_expired",
        paymentProviderStatus: "expired",
        providerPayloadJson: providerInvoice.raw,
        status: "failed",
        transactionId: ownedPayment.id,
      });

      return buildActionFailureResult({
        errorCode: "checkout-failed",
        message: "Batas waktu pembayaran sudah berakhir.",
        payment: mapTransactionToPaymentPageData(expiredTransaction),
      });
    }

    const pendingTransaction = await refreshTransactionPaymentState({
      amountRp: providerInvoice.amountTotal,
      failureReason: null,
      paymentProviderStatus: "pending",
      providerPayloadJson: providerInvoice.raw,
      transactionId: ownedPayment.id,
    });
    const pendingPayment = mapTransactionToPaymentPageData(pendingTransaction);

    if (pendingPayment.state === "expired") {
      const expiredTransaction = await refreshTransactionPaymentState({
        failureReason: "payment_expired",
        paymentProviderStatus: "expired",
        providerPayloadJson: providerInvoice.raw,
        status: "failed",
        transactionId: ownedPayment.id,
      });

      return buildActionFailureResult({
        errorCode: "checkout-failed",
        message: "Batas waktu pembayaran sudah berakhir.",
        payment: mapTransactionToPaymentPageData(expiredTransaction),
      });
    }

    return buildActionSuccessResult("Pembayaran masih menunggu konfirmasi.", pendingPayment);
  } catch (error) {
    return toPaymentActionFailure({
      error,
      payment: currentPayment,
    });
  }
}

export async function cancelMemberQrisPayment(input: {
  transactionId: string;
  userId: string;
}): Promise<PaymentActionResult> {
  const ownedPayment = await readOwnedPaymentOrError(input);

  if ("ok" in ownedPayment) {
    return ownedPayment;
  }

  const currentPayment = mapTransactionToPaymentPageData(ownedPayment);

  if (hasIncompleteQrisInvoiceData(ownedPayment)) {
    return buildActionFailureResult({
      errorCode: "provider-invalid-response",
      message: PAYMENT_INVOICE_INVALID_MESSAGE,
      payment: currentPayment,
    });
  }

  if (currentPayment.state !== "pending") {
    return buildActionFailureResult({
      errorCode: "payment-not-pending",
      message: PAYMENT_NOT_PENDING_MESSAGE,
      payment: currentPayment,
    });
  }

  if (!ownedPayment.providerInvoiceId) {
    return buildActionFailureResult({
      errorCode: "provider-invalid-response",
      message: PAYMENT_INVOICE_INVALID_MESSAGE,
      payment: currentPayment,
    });
  }

  try {
    const canceledProviderInvoice = await cancelInvoiceById(ownedPayment.providerInvoiceId);

    if (canceledProviderInvoice.providerStatus === "paid") {
      await refreshTransactionPaymentState({
        failureReason: null,
        paymentProviderStatus: "paid",
        providerPayloadJson: canceledProviderInvoice.raw,
        transactionId: ownedPayment.id,
      });

      const finalizedTransaction = await finalizePaidQrisTransaction(ownedPayment.id);
      const finalizedPayment = finalizedTransaction ? mapTransactionToPaymentPageData(finalizedTransaction) : null;

      if (!finalizedPayment) {
        return buildActionFailureResult({
          errorCode: "payment-not-found",
          message: PAYMENT_NOT_FOUND_MESSAGE,
          payment: null,
        });
      }

      if (finalizedPayment.state === "processing_failed") {
        return buildActionFailureResult({
          errorCode: "checkout-failed",
          message:
            "Pembayaran sudah diterima, tetapi aktivasi akses Anda belum selesai. Silakan cek lagi beberapa saat lagi.",
          payment: finalizedPayment,
        });
      }

      return buildActionSuccessResult(
        finalizedPayment.state === "success"
          ? "Pembayaran berhasil dikonfirmasi."
          : "Pembayaran sudah diterima dan sedang diproses.",
        finalizedPayment,
      );
    }

    const canceledTransaction = await refreshTransactionPaymentState({
      failureReason: "member_canceled",
      paymentProviderStatus: canceledProviderInvoice.providerStatus,
      providerPayloadJson: canceledProviderInvoice.raw,
      status: "canceled",
      transactionId: ownedPayment.id,
    });

    return buildActionSuccessResult(
      "Transaksi berhasil dibatalkan.",
      mapTransactionToPaymentPageData(canceledTransaction),
    );
  } catch (error) {
    return toPaymentActionFailure({
      error,
      payment: currentPayment,
    });
  }
}

export async function runReconcileQrisPaymentsCronJob(now: Date = new Date()): Promise<PaymentCronJobResult> {
  const candidates = await listQrisTransactionsForReconcile();
  let expiredCount = 0;
  let canceledCount = 0;
  let finalizedCount = 0;
  let failedCount = 0;

  for (const candidate of candidates) {
    try {
      if (candidate.paymentProviderStatus === "paid") {
        const finalizedTransaction = await finalizePaidQrisTransaction(candidate.transactionId);

        if (finalizedTransaction?.status === "success") {
          finalizedCount += 1;
        }

        continue;
      }

      if (candidate.providerExpiredAt && new Date(candidate.providerExpiredAt).getTime() <= now.getTime()) {
        await refreshTransactionPaymentState({
          failureReason: "payment_expired",
          paymentProviderStatus: "expired",
          status: "failed",
          transactionId: candidate.transactionId,
        });
        expiredCount += 1;
        continue;
      }

      const providerInvoice = await getInvoiceById(candidate.providerInvoiceId);

      if (providerInvoice.providerStatus === "paid") {
        await refreshTransactionPaymentState({
          amountRp: providerInvoice.amountTotal,
          failureReason: null,
          paymentProviderStatus: "paid",
          paymentReceivedAt: providerInvoice.paidAt,
          providerPayloadJson: providerInvoice.raw,
          transactionId: candidate.transactionId,
        });
        const finalizedTransaction = await finalizePaidQrisTransaction(candidate.transactionId);

        if (finalizedTransaction?.status === "success") {
          finalizedCount += 1;
        }

        continue;
      }

      if (providerInvoice.providerStatus === "failed") {
        if (await isMemberCanceledTransaction(candidate.transactionId)) {
          await refreshTransactionPaymentState({
            failureReason: "member_canceled",
            paymentProviderStatus: "canceled",
            providerPayloadJson: providerInvoice.raw,
            status: "canceled",
            transactionId: candidate.transactionId,
          });
          canceledCount += 1;
          continue;
        }

        await refreshTransactionPaymentState({
          failureReason: "payment_failed",
          paymentProviderStatus: "failed",
          providerPayloadJson: providerInvoice.raw,
          status: "failed",
          transactionId: candidate.transactionId,
        });
        failedCount += 1;
        continue;
      }

      if (providerInvoice.providerStatus === "expired") {
        await refreshTransactionPaymentState({
          failureReason: "payment_expired",
          paymentProviderStatus: "expired",
          providerPayloadJson: providerInvoice.raw,
          status: "failed",
          transactionId: candidate.transactionId,
        });
        expiredCount += 1;
        continue;
      }

      await refreshTransactionPaymentState({
        amountRp: providerInvoice.amountTotal,
        failureReason: null,
        paymentProviderStatus: "pending",
        providerPayloadJson: providerInvoice.raw,
        transactionId: candidate.transactionId,
      });
    } catch (error) {
      if (error instanceof InvoiceKuProviderError && error.code === "provider-not-found") {
        await refreshTransactionPaymentState({
          failureReason: "provider_invoice_not_found",
          paymentProviderStatus: "canceled",
          status: "canceled",
          transactionId: candidate.transactionId,
        });
        canceledCount += 1;
        continue;
      }

      if (isPaymentBackendNotReadyError(error)) {
        throw error;
      }

      failedCount += 1;
    }
  }

  return {
    canceledCount,
    checkedCount: candidates.length,
    executedAt: now.toISOString(),
    expiredCount,
    failedCount,
    finalizedCount,
    job: "reconcile-qris-payments",
    ok: true,
  };
}
