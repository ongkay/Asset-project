import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/transactions/repositories", () => ({
  insertTransaction: vi.fn(),
  linkTransactionToSubscription: vi.fn(),
  markTransactionAsCanceled: vi.fn(),
  markTransactionAsFailed: vi.fn(),
  markTransactionAsSucceeded: vi.fn(),
}));

import * as transactionRepositories from "@/modules/transactions/repositories";
import {
  attachTransactionToSubscription,
  cancelTransaction,
  createTransaction,
  failTransaction,
  succeedTransaction,
} from "@/modules/transactions/services";

const mockedInsertTransaction = vi.mocked(transactionRepositories.insertTransaction);
const mockedLinkTransactionToSubscription = vi.mocked(transactionRepositories.linkTransactionToSubscription);
const mockedMarkTransactionAsCanceled = vi.mocked(transactionRepositories.markTransactionAsCanceled);
const mockedMarkTransactionAsFailed = vi.mocked(transactionRepositories.markTransactionAsFailed);
const mockedMarkTransactionAsSucceeded = vi.mocked(transactionRepositories.markTransactionAsSucceeded);

describe("transactions/services", () => {
  beforeEach(() => {
    mockedInsertTransaction.mockReset();
    mockedLinkTransactionToSubscription.mockReset();
    mockedMarkTransactionAsCanceled.mockReset();
    mockedMarkTransactionAsFailed.mockReset();
    mockedMarkTransactionAsSucceeded.mockReset();
  });

  it("creates a pending transaction for member flows", async () => {
    mockedInsertTransaction.mockResolvedValueOnce({
      amountRp: 150000,
      code: "TRX-0001",
      createdAt: "2026-04-19T00:00:00.000Z",
      failureReason: null,
      id: "transaction-1",
      packageId: "package-1",
      packageName: "Paket 1",
      paidAt: null,
      source: "payment_dummy",
      status: "pending",
      subscriptionId: null,
      userId: "user-1",
    });

    await expect(
      createTransaction({
        amountRp: 150000,
        packageId: "package-1",
        packageName: "Paket 1",
        source: "payment_dummy",
        userId: "user-1",
      }),
    ).resolves.toMatchObject({
      id: "transaction-1",
      paidAt: null,
      status: "pending",
    });

    expect(mockedInsertTransaction).toHaveBeenCalledWith({
      amountRp: 150000,
      packageId: "package-1",
      packageName: "Paket 1",
      source: "payment_dummy",
      userId: "user-1",
    });
  });

  it("links a transaction to its subscription", async () => {
    await attachTransactionToSubscription("transaction-1", "subscription-1");

    expect(mockedLinkTransactionToSubscription).toHaveBeenCalledWith("transaction-1", "subscription-1");
  });

  it("marks a transaction as success with paidAt and no failure reason", async () => {
    await succeedTransaction("transaction-1");

    expect(mockedMarkTransactionAsSucceeded).toHaveBeenCalledWith("transaction-1", expect.any(String));
  });

  it("marks a transaction as failed with a failure reason and no paidAt", async () => {
    await failTransaction({
      failureReason: "checkout_failed",
      transactionId: "transaction-1",
    });

    expect(mockedMarkTransactionAsFailed).toHaveBeenCalledWith("transaction-1", "checkout_failed");
  });

  it("marks a transaction as canceled with a failure reason and no paidAt", async () => {
    await cancelTransaction({
      failureReason: "member_canceled",
      transactionId: "transaction-1",
    });

    expect(mockedMarkTransactionAsCanceled).toHaveBeenCalledWith("transaction-1", "member_canceled");
  });
});
