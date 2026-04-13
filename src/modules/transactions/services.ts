import "server-only";

import { insertTransaction, linkTransactionToSubscription } from "./repositories";

import type { CreateTransactionInput } from "./types";

export async function createTransaction(input: CreateTransactionInput) {
  return insertTransaction(input);
}

export async function attachTransactionToSubscription(transactionId: string, subscriptionId: string) {
  await linkTransactionToSubscription(transactionId, subscriptionId);
}
