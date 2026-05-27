import { InvoiceKuProviderError } from "@/lib/payments/invoiceku";

import type { CreateQrisPaymentForCheckoutResult, PaymentActionResult } from "./types";

export const PAYMENT_CHECKOUT_FAILED_MESSAGE = "Invoice QRIS belum bisa dibuat. Silakan coba lagi beberapa saat lagi.";
export const PAYMENT_BACKEND_NOT_READY_MESSAGE =
  "Backend pembayaran QRIS belum siap sepenuhnya. Silakan sinkronkan migration payment terbaru lalu coba lagi.";
export const PAYMENT_INVOICE_INVALID_MESSAGE =
  "Invoice QRIS untuk transaksi ini tidak lengkap. Silakan ulangi checkout untuk membuat QRIS baru.";
export const PAYMENT_NOT_FOUND_MESSAGE = "Transaksi pembayaran tidak ditemukan.";
export const PAYMENT_NOT_PENDING_MESSAGE = "Transaksi ini sudah tidak bisa diubah lagi.";
export const PROVIDER_UNAVAILABLE_MESSAGE = "Status pembayaran sedang belum bisa diperbarui. Coba lagi sebentar.";
export const PAYMENT_PROVIDER_CONFLICT_MESSAGE =
  "Invoice pembayaran yang diterima sedang bentrok. Silakan coba buat transaksi baru beberapa saat lagi.";

type PaymentFailureCode =
  | "checkout-failed"
  | "payment-backend-not-ready"
  | "provider-auth-error"
  | "provider-invalid-response"
  | "provider-not-found"
  | "provider-unavailable";

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return null;
}

function readErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

export function getPaymentRuntimeFailureReason(error: unknown) {
  return readErrorMessage(error) ?? "Unexpected payment error.";
}

export function isPaymentBackendNotReadyError(error: unknown) {
  const errorMessage = readErrorMessage(error)?.toLowerCase() ?? "";
  const errorCode = readErrorCode(error)?.toLowerCase() ?? "";

  if (errorCode === "23505" && errorMessage.includes("transactions_provider_invoice_id_unique_idx")) {
    return false;
  }

  return (
    errorCode === "42703" ||
    errorCode === "42p01" ||
    errorCode === "42804" ||
    errorCode === "22p02" ||
    errorMessage.includes("payment_provider") ||
    errorMessage.includes("payment_provider_status") ||
    errorMessage.includes("payment_fulfillment_status") ||
    errorMessage.includes("provider_invoice_id") ||
    errorMessage.includes("qris_string") ||
    errorMessage.includes("provider_payload_json") ||
    errorMessage.includes("source_enum") ||
    errorMessage.includes("payment_qris") ||
    errorMessage.includes("schema cache")
  );
}

export function mapPaymentFailure(error: unknown): {
  errorCode: PaymentFailureCode;
  message: string;
} {
  if (isPaymentBackendNotReadyError(error)) {
    return {
      errorCode: "payment-backend-not-ready",
      message: PAYMENT_BACKEND_NOT_READY_MESSAGE,
    };
  }

  if (error instanceof InvoiceKuProviderError) {
    if (error.code === "provider-unavailable") {
      return {
        errorCode: error.code,
        message: PROVIDER_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      errorCode: error.code,
      message: error.message,
    };
  }

  const errorMessage = readErrorMessage(error)?.toLowerCase() ?? "";
  const errorCode = readErrorCode(error)?.toLowerCase() ?? "";

  if (errorCode === "23505" && errorMessage.includes("transactions_provider_invoice_id_unique_idx")) {
    return {
      errorCode: "checkout-failed",
      message: PAYMENT_PROVIDER_CONFLICT_MESSAGE,
    };
  }

  return {
    errorCode: "checkout-failed",
    message: PAYMENT_CHECKOUT_FAILED_MESSAGE,
  };
}

export function toCreatePaymentFailure(error: unknown): Extract<CreateQrisPaymentForCheckoutResult, { ok: false }> {
  return {
    ...mapPaymentFailure(error),
    ok: false,
  };
}

export function toPaymentActionFailure(input: {
  error: unknown;
  payment: Extract<PaymentActionResult, { ok: false }>["payment"];
}): Extract<PaymentActionResult, { ok: false }> {
  return {
    ...mapPaymentFailure(input.error),
    ok: false,
    payment: input.payment,
  };
}
