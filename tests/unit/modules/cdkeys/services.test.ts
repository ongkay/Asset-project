import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/cdkeys/repositories", () => ({
  findCdKeyByCode: vi.fn(),
  releaseReservedCdKeyUsage: vi.fn(),
  reserveCdKeyUsage: vi.fn(),
}));

vi.mock("@/modules/subscriptions/services", () => ({
  activateSubscriptionWithCompensation: vi.fn(),
}));

vi.mock("@/modules/transactions/services", () => ({
  attachTransactionToSubscription: vi.fn(),
  createTransaction: vi.fn(),
  failTransaction: vi.fn(),
  succeedTransaction: vi.fn(),
}));

import * as cdKeyRepositories from "@/modules/cdkeys/repositories";
import { redeemCdKey } from "@/modules/cdkeys/services";
import * as subscriptionServices from "@/modules/subscriptions/services";
import * as transactionServices from "@/modules/transactions/services";

const mockedFindCdKeyByCode = vi.mocked(cdKeyRepositories.findCdKeyByCode);
const mockedReleaseReservedCdKeyUsage = vi.mocked(cdKeyRepositories.releaseReservedCdKeyUsage);
const mockedReserveCdKeyUsage = vi.mocked(cdKeyRepositories.reserveCdKeyUsage);
const mockedActivateSubscriptionWithCompensation = vi.mocked(subscriptionServices.activateSubscriptionWithCompensation);
const mockedAttachTransactionToSubscription = vi.mocked(transactionServices.attachTransactionToSubscription);
const mockedCreateTransaction = vi.mocked(transactionServices.createTransaction);
const mockedFailTransaction = vi.mocked(transactionServices.failTransaction);
const mockedSucceedTransaction = vi.mocked(transactionServices.succeedTransaction);

function createCdKeySnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "cdkey-1",
    code: "AB12CD34EF",
    isActive: true,
    usedAt: null,
    usedBy: null,
    packageSnapshot: {
      packageId: "package-1",
      name: "Premium Package",
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
    },
    ...overrides,
  };
}

describe("cdkeys/services", () => {
  beforeEach(() => {
    mockedFindCdKeyByCode.mockReset();
    mockedFindCdKeyByCode.mockResolvedValue(createCdKeySnapshot());
    mockedReleaseReservedCdKeyUsage.mockReset();
    mockedReserveCdKeyUsage.mockReset();
    mockedReserveCdKeyUsage.mockResolvedValue("2026-04-16T00:00:00.000Z");
    mockedActivateSubscriptionWithCompensation.mockReset();
    mockedActivateSubscriptionWithCompensation.mockResolvedValue({
      result: {
        subscriptionId: "subscription-1",
        mode: "create-new",
      },
      compensation: {
        rollback: vi.fn().mockResolvedValue(undefined),
      },
    });
    mockedAttachTransactionToSubscription.mockReset();
    mockedCreateTransaction.mockReset();
    mockedCreateTransaction.mockResolvedValue({
      id: "transaction-1",
      code: "TRX-0001",
      amountRp: 150000,
      createdAt: "2026-04-16T00:00:00.000Z",
      failureReason: null,
      packageId: "package-1",
      packageName: "Premium Package",
      paidAt: null,
      source: "cdkey",
      status: "pending",
      subscriptionId: null,
      userId: "user-1",
    });
    mockedFailTransaction.mockReset();
    mockedSucceedTransaction.mockReset();
  });

  it("returns code-invalid when the key is inactive", async () => {
    mockedFindCdKeyByCode.mockResolvedValueOnce(createCdKeySnapshot({ isActive: false }));

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "code-invalid",
      message: "CD-Key tidak valid atau sudah terpakai.",
    });
    expect(mockedReserveCdKeyUsage).not.toHaveBeenCalled();
  });

  it("returns code-used when the key is already consumed", async () => {
    mockedFindCdKeyByCode.mockResolvedValueOnce(
      createCdKeySnapshot({ usedAt: "2026-04-01T00:00:00.000Z", usedBy: "user-9" }),
    );

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "code-used",
      message: "CD-Key tidak valid atau sudah terpakai.",
    });
    expect(mockedReserveCdKeyUsage).not.toHaveBeenCalled();
  });

  it("rechecks reservation races and maps a now-disabled key to code-invalid", async () => {
    mockedReserveCdKeyUsage.mockResolvedValueOnce(null);
    mockedFindCdKeyByCode.mockResolvedValueOnce(createCdKeySnapshot());
    mockedFindCdKeyByCode.mockResolvedValueOnce(createCdKeySnapshot({ isActive: false }));

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "code-invalid",
      message: "CD-Key tidak valid atau sudah terpakai.",
    });
    expect(mockedCreateTransaction).not.toHaveBeenCalled();
  });

  it("maps a reservation race with a now-used key to code-used", async () => {
    mockedReserveCdKeyUsage.mockResolvedValueOnce(null);
    mockedFindCdKeyByCode.mockResolvedValueOnce(createCdKeySnapshot());
    mockedFindCdKeyByCode.mockResolvedValueOnce(
      createCdKeySnapshot({ usedAt: "2026-04-16T00:01:00.000Z", usedBy: "user-9" }),
    );

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "code-used",
      message: "CD-Key tidak valid atau sudah terpakai.",
    });
    expect(mockedCreateTransaction).not.toHaveBeenCalled();
  });

  it("creates, links, and finalizes the redeem transaction from the cd-key snapshot", async () => {
    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: true,
      subscriptionId: "subscription-1",
      transactionId: "transaction-1",
    });
    expect(mockedCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        cdKeyId: "cdkey-1",
        source: "cdkey",
        userId: "user-1",
      }),
    );
    expect(mockedActivateSubscriptionWithCompensation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        source: "cdkey",
        packageSnapshot: {
          packageId: "package-1",
          name: "Premium Package",
          amountRp: 150000,
          durationDays: 30,
          isExtended: true,
          accessKeys: ["tradingview:private"],
        },
      }),
    );
    expect(mockedAttachTransactionToSubscription).toHaveBeenCalledWith("transaction-1", "subscription-1");
    expect(mockedSucceedTransaction).toHaveBeenCalledWith("transaction-1");
  });

  it("redeems successfully from a valid cd-key snapshot even when the package master is now disabled", async () => {
    mockedFindCdKeyByCode.mockResolvedValueOnce(
      createCdKeySnapshot({
        packageSnapshot: {
          packageId: "package-disabled",
          name: "Disabled Snapshot Package",
          amountRp: 99000,
          durationDays: 14,
          isExtended: false,
          accessKeys: ["fxreplay:share"],
        },
      }),
    );

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: true,
      subscriptionId: "subscription-1",
      transactionId: "transaction-1",
    });
    expect(mockedCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        packageSnapshot: {
          packageId: "package-disabled",
          name: "Disabled Snapshot Package",
          amountRp: 99000,
        },
      }),
    );
    expect(mockedActivateSubscriptionWithCompensation).toHaveBeenCalledWith(
      expect.objectContaining({
        packageSnapshot: {
          packageId: "package-disabled",
          name: "Disabled Snapshot Package",
          amountRp: 99000,
          durationDays: 14,
          isExtended: false,
          accessKeys: ["fxreplay:share"],
        },
      }),
    );
  });

  it("rolls back the reservation and fails the transaction when activation throws", async () => {
    mockedActivateSubscriptionWithCompensation.mockRejectedValueOnce(new Error("asset assignment failed"));

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "redeem-failed",
      message: "Redeem CD-Key gagal diproses. Silakan coba lagi.",
    });
    expect(mockedReleaseReservedCdKeyUsage).toHaveBeenCalledWith({
      cdKeyId: "cdkey-1",
      reservedAt: "2026-04-16T00:00:00.000Z",
      userId: "user-1",
    });
    expect(mockedFailTransaction).toHaveBeenCalledWith({
      transactionId: "transaction-1",
      failureReason: "asset assignment failed",
    });
    expect(mockedSucceedTransaction).not.toHaveBeenCalled();
  });

  it("compensates activation before releasing the key when succeedTransaction fails", async () => {
    mockedSucceedTransaction.mockRejectedValueOnce(new Error("success finalize failed"));

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "redeem-failed",
      message: "Redeem CD-Key gagal diproses. Silakan coba lagi.",
    });
    expect(mockedReleaseReservedCdKeyUsage).toHaveBeenCalledWith({
      cdKeyId: "cdkey-1",
      reservedAt: "2026-04-16T00:00:00.000Z",
      userId: "user-1",
    });
    expect(mockedFailTransaction).toHaveBeenCalledWith({
      transactionId: "transaction-1",
      failureReason: "success finalize failed",
    });
    expect(mockedReleaseReservedCdKeyUsage.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockedSucceedTransaction.mock.invocationCallOrder[0],
    );
  });

  it("does not mask the original redeem failure when failTransaction rejects after finalization race", async () => {
    mockedSucceedTransaction.mockRejectedValueOnce(new Error("success finalize failed"));
    mockedFailTransaction.mockRejectedValueOnce(new Error("Transaction is missing or already finalized."));

    const result = await redeemCdKey({ userId: "user-1", code: "AB12CD34EF" });

    expect(result).toEqual({
      ok: false,
      errorCode: "redeem-failed",
      message: "Redeem CD-Key gagal diproses. Silakan coba lagi.",
    });
  });
});
