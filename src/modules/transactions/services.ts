import "server-only";

import {
  insertTransaction,
  linkTransactionToSubscription,
  markTransactionAsCanceled,
  markTransactionAsFailed,
  markTransactionAsSucceeded,
} from "./repositories";

import type { CreateTransactionInput, FinalizeTransactionFailureInput } from "./types";

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
