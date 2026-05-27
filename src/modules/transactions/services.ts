import "server-only";

import {
  claimTransactionPaymentFulfillment,
  insertTransaction,
  linkTransactionToSubscription,
  markTransactionPaymentFulfilled,
  markTransactionPaymentFulfillmentFailed,
  markTransactionAsCanceled,
  markTransactionAsFailed,
  markTransactionAsSucceeded,
  saveTransactionPaymentInvoiceData,
  updateTransactionPaymentState,
} from "./repositories";

import type {
  CreateTransactionInput,
  FinalizeTransactionFailureInput,
  SaveTransactionPaymentInvoiceDataInput,
  UpdateTransactionPaymentStateInput,
} from "./types";

export async function createTransaction(input: CreateTransactionInput) {
  return insertTransaction(input);
}

export async function attachTransactionToSubscription(transactionId: string, subscriptionId: string) {
  await linkTransactionToSubscription(transactionId, subscriptionId);
}

export async function succeedTransaction(transactionId: string) {
  await markTransactionAsSucceeded(transactionId, new Date().toISOString());
}

export async function failTransaction(input: FinalizeTransactionFailureInput) {
  await markTransactionAsFailed(input.transactionId, input.failureReason);
}

export async function cancelTransaction(input: FinalizeTransactionFailureInput) {
  await markTransactionAsCanceled(input.transactionId, input.failureReason);
}

export async function saveTransactionInvoiceData(input: SaveTransactionPaymentInvoiceDataInput) {
  return saveTransactionPaymentInvoiceData(input);
}

export async function refreshTransactionPaymentState(input: UpdateTransactionPaymentStateInput) {
  return updateTransactionPaymentState(input);
}

export async function claimPaidTransactionFulfillment(transactionId: string) {
  return claimTransactionPaymentFulfillment(transactionId);
}

export async function failTransactionPaymentFulfillment(input: FinalizeTransactionFailureInput) {
  await markTransactionPaymentFulfillmentFailed(input);
}

export async function fulfillTransactionPayment(input: {
  paidAt: string;
  paymentReceivedAt: string | null;
  transactionId: string;
}) {
  await markTransactionPaymentFulfilled(input);
}
