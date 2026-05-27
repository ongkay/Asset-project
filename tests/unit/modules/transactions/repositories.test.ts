import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

describe("transactions/repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("inserts a new transaction as pending with paid_at and failure_reason cleared", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        amount_rp: 150000,
        code: "TRX-0001",
        created_at: "2026-04-19T00:00:00.000Z",
        failure_reason: null,
        id: "transaction-1",
        list_amount_rp: 150000,
        payment_fee_amount_rp: null,
        payment_fulfillment_status: null,
        payment_provider: null,
        payment_provider_status: null,
        payment_received_at: null,
        package_discount_amount_rp: 0,
        package_id: "package-1",
        package_name: "Paket 1",
        paid_at: null,
        provider_expired_at: null,
        provider_invoice_id: null,
        provider_payment_url: null,
        provider_payload_json: null,
        qris_string: null,
        source: "payment_dummy",
        status: "pending",
        subscription_id: null,
        user_id: "user-1",
        voucher_code: null,
        voucher_discount_amount_rp: 0,
        voucher_discount_percent: null,
        voucher_id: null,
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert }),
    });

    const { insertTransaction } = await import("@/modules/transactions/repositories");

    await expect(
      insertTransaction({
        packageSnapshot: {
          amountRp: 150000,
          packageId: "package-1",
          name: "Paket 1",
        },
        source: "payment_dummy",
        userId: "user-1",
      }),
    ).resolves.toMatchObject({
      id: "transaction-1",
      paidAt: null,
      failureReason: null,
      status: "pending",
    });

    expect(insert).toHaveBeenCalledWith([
      {
        amount_rp: 150000,
        cd_key_id: null,
        code: expect.stringMatching(/^TRX-[A-Z0-9]{12}$/),
        failure_reason: null,
        list_amount_rp: 150000,
        payment_fee_amount_rp: null,
        payment_fulfillment_status: null,
        payment_provider: null,
        payment_provider_status: null,
        payment_received_at: null,
        package_discount_amount_rp: 0,
        package_id: "package-1",
        package_name: "Paket 1",
        paid_at: null,
        provider_expired_at: null,
        provider_invoice_id: null,
        provider_payment_url: null,
        provider_payload_json: null,
        qris_string: null,
        source: "payment_dummy",
        status: "pending",
        subscription_id: null,
        user_id: "user-1",
        voucher_code: null,
        voucher_discount_amount_rp: 0,
        voucher_discount_percent: null,
        voucher_id: null,
      },
    ]);
  });

  it("updates a linked subscription id without touching status fields", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { linkTransactionToSubscription } = await import("@/modules/transactions/repositories");

    await linkTransactionToSubscription("transaction-1", "subscription-1");

    expect(update).toHaveBeenCalledWith({ subscription_id: "subscription-1" });
    expect(eq).toHaveBeenCalledWith("id", "transaction-1");
  });

  it("marks a transaction as success with paid_at and no failure reason", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "transaction-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { markTransactionAsSucceeded } = await import("@/modules/transactions/repositories");

    await markTransactionAsSucceeded("transaction-1", new Date().toISOString());

    expect(update).toHaveBeenCalledWith({
      failure_reason: null,
      paid_at: "2026-04-19T10:00:00.000Z",
      status: "success",
    });
    expect(eqId).toHaveBeenCalledWith("id", "transaction-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "pending");

    vi.useRealTimers();
  });

  it("marks a transaction as failed with null paid_at and an auditable failure reason", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "transaction-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { markTransactionAsFailed } = await import("@/modules/transactions/repositories");

    await markTransactionAsFailed("transaction-1", "checkout_failed");

    expect(update).toHaveBeenCalledWith({
      failure_reason: "checkout_failed",
      paid_at: null,
      status: "failed",
    });
    expect(eqId).toHaveBeenCalledWith("id", "transaction-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "pending");
  });

  it("marks a transaction as canceled with null paid_at and an auditable failure reason", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "transaction-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { markTransactionAsCanceled } = await import("@/modules/transactions/repositories");

    await markTransactionAsCanceled("transaction-1", "member_canceled");

    expect(update).toHaveBeenCalledWith({
      failure_reason: "member_canceled",
      paid_at: null,
      status: "canceled",
    });
    expect(eqId).toHaveBeenCalledWith("id", "transaction-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "pending");
  });

  it("rejects re-finalization when the transaction is no longer pending", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { markTransactionAsSucceeded } = await import("@/modules/transactions/repositories");

    await expect(markTransactionAsSucceeded("transaction-1", "2026-04-19T10:00:00.000Z")).rejects.toThrow(
      "Transaction is missing or already finalized.",
    );
  });

  it("rejects finalize when no transaction row matches the id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { markTransactionAsFailed } = await import("@/modules/transactions/repositories");

    await expect(markTransactionAsFailed("missing-transaction", "checkout_failed")).rejects.toThrow(
      "Transaction is missing or already finalized.",
    );
  });

  it("does not let pending refreshes overwrite member-canceled transactions", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const neqPaymentProviderStatus = vi.fn().mockReturnValue({ select });
    const neqStatus = vi.fn().mockReturnValue({ neq: neqPaymentProviderStatus });
    const eq = vi.fn().mockReturnValue({ neq: neqStatus });
    const update = vi.fn().mockReturnValue({ eq });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    const { updateTransactionPaymentState } = await import("@/modules/transactions/repositories");

    await expect(
      updateTransactionPaymentState({
        paymentProviderStatus: "pending",
        transactionId: "transaction-1",
      }),
    ).rejects.toThrow("Transaction is missing.");

    expect(neqStatus).toHaveBeenCalledWith("status", "canceled");
    expect(neqPaymentProviderStatus).toHaveBeenCalledWith("payment_provider_status", "canceled");
  });
});
