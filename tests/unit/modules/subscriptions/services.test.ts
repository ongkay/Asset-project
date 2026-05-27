import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/packages/services", () => ({
  getMemberPurchasablePackageById: vi.fn(),
  getPackageById: vi.fn(),
  toPackageActivationSnapshot: vi.fn(
    (packageSnapshot: {
      packageId: string;
      accessKeys: string[];
      amountRp: number;
      durationDays: number;
      isExtended: boolean;
      name: string;
    }) => ({
      packageId: packageSnapshot.packageId,
      accessKeys: packageSnapshot.accessKeys,
      amountRp: packageSnapshot.amountRp,
      durationDays: packageSnapshot.durationDays,
      isExtended: packageSnapshot.isExtended,
      name: packageSnapshot.name,
    }),
  ),
}));

vi.mock("@/modules/subscriptions/repositories", () => ({
  applySubscriptionStatus: vi.fn(),
  assignBestAssetForSubscription: vi.fn(),
  cancelSubscriptionRow: vi.fn(),
  createSubscriptionWithSnapshot: vi.fn(),
  createTransactionRow: vi.fn(),
  getPackageById: vi.fn(),
  getRunningSubscriptionByUserId: vi.fn(),
  getSubscriptionById: vi.fn(),
  insertManualAssignmentRow: vi.fn(),
  listActiveAssignmentsBySubscriptionId: vi.fn(),
  listCurrentAssignmentsBySubscriptionId: vi.fn(),
  revokeActiveAssignmentsBySubscriptionId: vi.fn(),
  restoreSubscriptionRow: vi.fn(),
  updateSubscriptionWindow: vi.fn(),
}));

vi.mock("@/modules/transactions/services", () => ({
  attachTransactionToSubscription: vi.fn(),
  createTransaction: vi.fn(),
  failTransaction: vi.fn(),
  succeedTransaction: vi.fn(),
}));

vi.mock("@/modules/vouchers/services", () => ({
  consumeVoucherUsage: vi.fn(),
}));

vi.mock("@/modules/assets/services", () => ({
  createAsset: vi.fn(),
}));

import * as packageServices from "@/modules/packages/services";
import * as subscriptionRepositories from "@/modules/subscriptions/repositories";
import {
  activateSubscription,
  activateSubscriptionWithCompensation,
  activateSubscriptionManually,
  buildQuickAddAssetInput,
  cancelSubscription,
  purchaseSubscriptionWithPaymentDummy,
} from "@/modules/subscriptions/services";
import * as transactionServices from "@/modules/transactions/services";

import type { MemberPurchasablePackage, PackageRow } from "@/modules/packages/types";
import type { SubscriptionPackageSnapshot, SubscriptionRow } from "@/modules/subscriptions/types";

const mockedGetMemberPurchasablePackageById = vi.mocked(packageServices.getMemberPurchasablePackageById);
const mockedGetPackageByIdFromPackages = vi.mocked(packageServices.getPackageById);
const mockedApplySubscriptionStatus = vi.mocked(subscriptionRepositories.applySubscriptionStatus);
const mockedAssignBestAssetForSubscription = vi.mocked(subscriptionRepositories.assignBestAssetForSubscription);
const mockedCancelSubscriptionRow = vi.mocked(subscriptionRepositories.cancelSubscriptionRow);
const mockedCreateSubscriptionWithSnapshot = vi.mocked(subscriptionRepositories.createSubscriptionWithSnapshot);
const mockedCreateTransactionRow = vi.mocked(subscriptionRepositories.createTransactionRow);
const mockedGetPackageById = vi.mocked(subscriptionRepositories.getPackageById);
const mockedGetRunningSubscriptionByUserId = vi.mocked(subscriptionRepositories.getRunningSubscriptionByUserId);
const mockedGetSubscriptionById = vi.mocked(subscriptionRepositories.getSubscriptionById);
const mockedInsertManualAssignmentRow = vi.mocked(subscriptionRepositories.insertManualAssignmentRow);
const mockedListActiveAssignmentsBySubscriptionId = vi.mocked(
  subscriptionRepositories.listActiveAssignmentsBySubscriptionId,
);
const mockedListCurrentAssignmentsBySubscriptionId = vi.mocked(
  subscriptionRepositories.listCurrentAssignmentsBySubscriptionId,
);
const mockedRevokeActiveAssignmentsBySubscriptionId = vi.mocked(
  subscriptionRepositories.revokeActiveAssignmentsBySubscriptionId,
);
const mockedRestoreSubscriptionRow = vi.mocked(subscriptionRepositories.restoreSubscriptionRow);
const mockedUpdateSubscriptionWindow = vi.mocked(subscriptionRepositories.updateSubscriptionWindow);
const mockedAttachTransactionToSubscription = vi.mocked(transactionServices.attachTransactionToSubscription);
const mockedCreateTransaction = vi.mocked(transactionServices.createTransaction);
const mockedFailTransaction = vi.mocked(transactionServices.failTransaction);
const mockedSucceedTransaction = vi.mocked(transactionServices.succeedTransaction);

function createPackageSnapshot(overrides: Partial<SubscriptionPackageSnapshot> = {}): SubscriptionPackageSnapshot {
  return {
    packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    name: "Premium Package",
    amountRp: 150000,
    durationDays: 30,
    isExtended: true,
    accessKeys: ["tradingview:private"],
    ...overrides,
  };
}

function createMemberPackageSnapshot(overrides: Partial<MemberPurchasablePackage> = {}): MemberPurchasablePackage {
  return {
    accessKeys: ["tradingview:private"],
    amountRp: 150000,
    checkoutGroup: "full-private",
    durationDays: 30,
    id: "package-1",
    isExtended: true,
    listAmountRp: 180000,
    name: "Premium Package",
    packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    sortOrder: 10,
    summary: "private",
    ...overrides,
  };
}

function createPackageRowSnapshot(overrides: Partial<PackageRow> = {}): PackageRow {
  return {
    accessKeys: ["tradingview:private"],
    amountRp: 150000,
    checkoutGroup: "legacy",
    checkoutUrl: null,
    code: "PKG-1",
    createdAt: "2026-04-01T00:00:00.000Z",
    durationDays: 30,
    id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    isActive: true,
    isExtended: true,
    listAmountRp: 150000,
    name: "Premium Package",
    sortOrder: 0,
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createSubscriptionRow(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: "subscription-1",
    userId: "user-1",
    packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    packageName: "Premium Package",
    accessKeys: ["tradingview:private"],
    status: "active",
    source: "admin_manual",
    startAt: "2026-04-01T00:00:00.000Z",
    endAt: "2026-04-20T00:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("subscriptions/services", () => {
  beforeEach(() => {
    mockedGetMemberPurchasablePackageById.mockReset();
    mockedGetPackageByIdFromPackages.mockReset();
    mockedApplySubscriptionStatus.mockResolvedValue("active");
    mockedAssignBestAssetForSubscription.mockResolvedValue(null);
    mockedCancelSubscriptionRow.mockResolvedValue(createSubscriptionRow({ status: "canceled" }));
    mockedCreateSubscriptionWithSnapshot.mockResolvedValue(createSubscriptionRow({ id: "subscription-2" }));
    mockedCreateTransactionRow.mockResolvedValue({ id: "transaction-1", code: "TX-ADM-0001" });
    mockedGetPackageById.mockResolvedValue(createPackageSnapshot());
    mockedGetRunningSubscriptionByUserId.mockResolvedValue(null);
    mockedGetSubscriptionById.mockResolvedValue(createSubscriptionRow());
    mockedInsertManualAssignmentRow.mockResolvedValue({ id: "assignment-1" });
    mockedListActiveAssignmentsBySubscriptionId.mockResolvedValue([]);
    mockedListCurrentAssignmentsBySubscriptionId.mockResolvedValue([]);
    mockedRevokeActiveAssignmentsBySubscriptionId.mockResolvedValue({ count: 0 });
    mockedRestoreSubscriptionRow.mockResolvedValue(createSubscriptionRow());
    mockedUpdateSubscriptionWindow.mockResolvedValue(createSubscriptionRow({ endAt: "2026-05-05T00:00:00.000Z" }));
    mockedAttachTransactionToSubscription.mockReset();
    mockedCreateTransaction.mockReset();
    mockedCreateTransaction.mockResolvedValue({
      id: "transaction-member-1",
      code: "TRX-0001",
      amountRp: 150000,
      createdAt: "2026-04-16T00:00:00.000Z",
      failureReason: null,
      listAmountRp: 150000,
      paymentFeeAmountRp: null,
      paymentFulfillmentStatus: null,
      paymentProvider: null,
      paymentProviderStatus: null,
      paymentReceivedAt: null,
      packageDiscountAmountRp: 0,
      packageId: "package-1",
      packageName: "Premium Package",
      paidAt: null,
      providerExpiredAt: null,
      providerInvoiceId: null,
      providerPaymentUrl: null,
      providerPayloadJson: null,
      qrisString: null,
      source: "payment_dummy",
      status: "pending",
      subscriptionId: null,
      userId: "user-1",
      voucherCode: null,
      voucherDiscountAmountRp: 0,
      voucherDiscountPercent: null,
      voucherId: null,
    });
    mockedFailTransaction.mockReset();
    mockedSucceedTransaction.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds quick-add input with a derived private access key", () => {
    const packageSnapshot = createPackageSnapshot({ accessKeys: ["tradingview:private", "fxreplay:share"] });

    const result = buildQuickAddAssetInput(
      {
        userId: "user-1",
        packageId: "package-1",
        subscriptionId: "subscription-1",
        platform: "tradingview",
        account: " trader@example.com ",
        durationDays: 7,
        note: " new inventory ",
        proxy: null,
        assetJsonText: '{"session":"abc"}',
      },
      packageSnapshot,
      new Date("2026-04-16T00:00:00.000Z"),
    );

    expect(result).toEqual({
      userId: "user-1",
      packageId: "package-1",
      subscriptionId: "subscription-1",
      accessKey: "tradingview:private",
      platform: "tradingview",
      assetType: "private",
      account: "trader@example.com",
      note: "new inventory",
      proxy: null,
      assetJson: { session: "abc" },
      expiresAt: "2026-04-23T00:00:00.000Z",
    });
  });

  it("rejects activation when a legacy package snapshot has no valid access keys", async () => {
    await expect(
      activateSubscriptionWithCompensation({
        userId: "user-1",
        packageSnapshot: createPackageSnapshot({ accessKeys: [] }),
        durationDays: 30,
        manualAssignmentsByAccessKey: {},
        source: "payment_dummy",
      }),
    ).rejects.toThrow("Package access keys are invalid.");

    expect(mockedGetRunningSubscriptionByUserId).not.toHaveBeenCalled();
  });

  it("rejects quick-add when the package does not grant the matching private entitlement", () => {
    const packageSnapshot = createPackageSnapshot({ accessKeys: ["fxreplay:share"] });

    expect(() =>
      buildQuickAddAssetInput(
        {
          userId: "user-1",
          packageId: "package-1",
          subscriptionId: null,
          platform: "tradingview",
          account: "trader@example.com",
          durationDays: 7,
          note: null,
          proxy: null,
          assetJsonText: '{"session":"abc"}',
        },
        packageSnapshot,
        new Date("2026-04-16T00:00:00.000Z"),
      ),
    ).toThrow("Selected package does not allow quick-add for tradingview:private.");
  });

  it("extends the same subscription row for the same package when is_extended is true", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T00:00:00.000Z"));

    mockedGetRunningSubscriptionByUserId.mockResolvedValueOnce(createSubscriptionRow());
    mockedListActiveAssignmentsBySubscriptionId.mockResolvedValueOnce([
      {
        id: "assignment-1",
        accessKey: "tradingview:private",
        assetId: "asset-1",
      },
    ]);

    const result = await activateSubscriptionManually({
      userId: "user-1",
      packageSnapshot: createPackageSnapshot(),
      durationDays: 15,
      manualAssignmentsByAccessKey: {},
      source: "admin_manual",
    });

    expect(result).toEqual({
      subscriptionId: "subscription-1",
      transactionId: "transaction-1",
      mode: "extend-existing",
    });
    expect(mockedUpdateSubscriptionWindow).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      endAt: "2026-05-05T00:00:00.000Z",
    });
    expect(mockedCreateSubscriptionWithSnapshot).not.toHaveBeenCalled();
    expect(mockedCancelSubscriptionRow).not.toHaveBeenCalled();
    expect(mockedRevokeActiveAssignmentsBySubscriptionId).not.toHaveBeenCalled();
    expect(mockedCreateTransactionRow).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        subscriptionId: "subscription-1",
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        packageName: "Premium Package",
        source: "admin_manual",
        status: "success",
        amountRp: 150000,
      }),
    );
  });

  it("returns a transaction-agnostic activation result for replacement flows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T00:00:00.000Z"));

    mockedGetRunningSubscriptionByUserId.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-old",
        packageId: "package-old",
        packageName: "Legacy Package",
      }),
    );
    mockedCreateSubscriptionWithSnapshot.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-new",
        packageId: "package-2",
        packageName: "Replacement Package",
        accessKeys: ["fxreplay:share"],
      }),
    );

    const result = await activateSubscription({
      userId: "user-1",
      packageSnapshot: createPackageSnapshot({
        packageId: "package-2",
        name: "Replacement Package",
        accessKeys: ["fxreplay:share"],
        isExtended: false,
      }),
      durationDays: 20,
      manualAssignmentsByAccessKey: {},
      source: "payment_dummy",
    });

    expect(result).toEqual({
      subscriptionId: "subscription-new",
      mode: "replace-immediately",
    });
    expect(mockedRevokeActiveAssignmentsBySubscriptionId).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      revokeReason: "subscription_replaced",
    });
    expect(mockedCreateTransactionRow).not.toHaveBeenCalled();
  });

  it("rolls back create-new activation when fulfillSubscriptionAccessKeys fails after subscription creation", async () => {
    mockedAssignBestAssetForSubscription.mockRejectedValueOnce(new Error("assignment failed"));

    await expect(
      activateSubscriptionWithCompensation({
        userId: "user-1",
        packageSnapshot: createPackageSnapshot(),
        durationDays: 30,
        manualAssignmentsByAccessKey: {},
        source: "payment_dummy",
      }),
    ).rejects.toThrow("assignment failed");

    expect(mockedCreateSubscriptionWithSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      }),
    );
    expect(mockedRevokeActiveAssignmentsBySubscriptionId).toHaveBeenCalledWith({
      subscriptionId: "subscription-2",
      revokeReason: "subscription_compensation",
    });
    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-2",
      cancelReason: "payment_dummy_compensation",
    });
  });

  it("restores the previous subscription when applySubscriptionStatus fails after replacement mutation", async () => {
    mockedGetRunningSubscriptionByUserId.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-old",
        packageId: "package-old",
        packageName: "Legacy Package",
        accessKeys: ["fxreplay:share"],
      }),
    );
    mockedListCurrentAssignmentsBySubscriptionId.mockResolvedValueOnce([
      {
        accessKey: "fxreplay:share",
        assetId: "asset-old",
        platform: "fxreplay",
        assetType: "share",
        note: null,
        expiresAt: "2026-04-20T00:00:00.000Z",
        assignmentId: "assignment-old",
      },
    ]);
    mockedApplySubscriptionStatus.mockRejectedValueOnce(new Error("status failed"));

    await expect(
      activateSubscriptionWithCompensation({
        userId: "user-1",
        packageSnapshot: createPackageSnapshot({
          packageId: "package-2",
          name: "Replacement Package",
          accessKeys: ["tradingview:private"],
        }),
        durationDays: 20,
        manualAssignmentsByAccessKey: {},
        source: "cdkey",
      }),
    ).rejects.toThrow("status failed");

    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      cancelReason: "replaced_by_cdkey",
    });
    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-2",
      cancelReason: "cdkey_compensation",
    });
    expect(mockedRestoreSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      status: "active",
      endAt: "2026-04-20T00:00:00.000Z",
    });
    expect(mockedInsertManualAssignmentRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      userId: "user-1",
      accessKey: "fxreplay:share",
      assetId: "asset-old",
    });
  });

  it("creates, links, and finalizes a member payment transaction on success", async () => {
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(createMemberPackageSnapshot());

    const result = await purchaseSubscriptionWithPaymentDummy({
      userId: "user-1",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(result).toEqual({
      ok: true,
      subscriptionId: "subscription-2",
      transactionId: "transaction-member-1",
      redirectTo: "/member",
    });
    expect(mockedCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        source: "payment_dummy",
        packageSnapshot: {
          packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          name: "Premium Package",
          amountRp: 150000,
        },
      }),
    );
    expect(mockedCreateSubscriptionWithSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        accessKeys: ["tradingview:private"],
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      }),
    );
    expect(mockedAttachTransactionToSubscription).toHaveBeenCalledWith("transaction-member-1", "subscription-2");
    expect(mockedSucceedTransaction).toHaveBeenCalledWith("transaction-member-1");
    expect(mockedFailTransaction).not.toHaveBeenCalled();
  });

  it("returns disabled-package when the selected package is no longer active", async () => {
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(null);
    mockedGetPackageByIdFromPackages.mockResolvedValueOnce(createPackageRowSnapshot({ isActive: false }));

    const result = await purchaseSubscriptionWithPaymentDummy({
      userId: "user-1",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "disabled-package",
      message: "Package sudah tidak tersedia untuk pembelian baru.",
    });
    expect(mockedCreateTransaction).not.toHaveBeenCalled();
  });

  it("fails the transient member transaction when checkout orchestration throws", async () => {
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(createMemberPackageSnapshot());
    mockedCreateSubscriptionWithSnapshot.mockRejectedValueOnce(new Error("assignment failure"));

    const result = await purchaseSubscriptionWithPaymentDummy({
      userId: "user-1",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "checkout-failed",
      message: "Pembayaran dummy gagal diproses. Silakan coba lagi.",
    });
    expect(mockedFailTransaction).toHaveBeenCalledWith({
      transactionId: "transaction-member-1",
      failureReason: "assignment failure",
    });
    expect(mockedSucceedTransaction).not.toHaveBeenCalled();
  });

  it("compensates activation before failing the transaction when attach fails", async () => {
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(createMemberPackageSnapshot());
    mockedAttachTransactionToSubscription.mockRejectedValueOnce(new Error("attach failed"));

    const result = await purchaseSubscriptionWithPaymentDummy({
      userId: "user-1",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "checkout-failed",
      message: "Pembayaran dummy gagal diproses. Silakan coba lagi.",
    });
    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-2",
      cancelReason: "payment_dummy_compensation",
    });
    expect(mockedRevokeActiveAssignmentsBySubscriptionId).toHaveBeenCalledWith({
      subscriptionId: "subscription-2",
      revokeReason: "subscription_compensation",
    });
    expect(mockedFailTransaction).toHaveBeenCalledWith({
      transactionId: "transaction-member-1",
      failureReason: "attach failed",
    });
  });

  it("uses source-aware cancel reasons for non-admin replacement flows", async () => {
    mockedGetRunningSubscriptionByUserId.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-old",
        packageId: "package-old",
        packageName: "Legacy Package",
      }),
    );
    mockedCreateSubscriptionWithSnapshot.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-new",
        packageId: "package-2",
        packageName: "Replacement Package",
        accessKeys: ["fxreplay:share"],
      }),
    );

    await activateSubscription({
      userId: "user-1",
      packageSnapshot: createPackageSnapshot({
        packageId: "package-2",
        name: "Replacement Package",
        accessKeys: ["fxreplay:share"],
        isExtended: false,
      }),
      durationDays: 20,
      manualAssignmentsByAccessKey: {},
      source: "payment_dummy",
    });

    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      cancelReason: "replaced_by_payment_dummy",
    });
  });

  it("does not mask the original failure when failTransaction rejects after a finalization race", async () => {
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(createMemberPackageSnapshot());
    mockedAttachTransactionToSubscription.mockRejectedValueOnce(new Error("attach failed"));
    mockedFailTransaction.mockRejectedValueOnce(new Error("Transaction is missing or already finalized."));

    const result = await purchaseSubscriptionWithPaymentDummy({
      userId: "user-1",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "checkout-failed",
      message: "Pembayaran dummy gagal diproses. Silakan coba lagi.",
    });
  });

  it("keeps the original checkout failure when rollback also throws and still attempts failTransaction", async () => {
    mockedGetMemberPurchasablePackageById.mockResolvedValueOnce(createMemberPackageSnapshot());
    mockedAttachTransactionToSubscription.mockRejectedValueOnce(new Error("attach failed"));
    mockedCancelSubscriptionRow.mockRejectedValueOnce(new Error("rollback failed"));

    const result = await purchaseSubscriptionWithPaymentDummy({
      userId: "user-1",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(result).toEqual({
      ok: false,
      errorCode: "checkout-failed",
      message: "Pembayaran dummy gagal diproses. Silakan coba lagi.",
    });
    expect(mockedFailTransaction).toHaveBeenCalledWith({
      transactionId: "transaction-member-1",
      failureReason: "attach failed",
    });
  });

  it("replaces the running subscription with carry-over when the next package is extended", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T00:00:00.000Z"));

    mockedGetRunningSubscriptionByUserId.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-old",
        packageId: "package-old",
        packageName: "Legacy Package",
        endAt: "2026-04-20T00:00:00.000Z",
      }),
    );
    mockedCreateSubscriptionWithSnapshot.mockResolvedValueOnce(
      createSubscriptionRow({
        id: "subscription-new",
        packageId: "package-2",
        packageName: "Replacement Package",
        accessKeys: ["fxreplay:share", "tradingview:private"],
        endAt: "2026-05-10T00:00:00.000Z",
      }),
    );

    const result = await activateSubscriptionManually({
      userId: "user-1",
      packageSnapshot: createPackageSnapshot({
        packageId: "package-2",
        name: "Replacement Package",
        amountRp: 250000,
        durationDays: 20,
        isExtended: true,
        accessKeys: ["fxreplay:share", "tradingview:private"],
      }),
      durationDays: 20,
      manualAssignmentsByAccessKey: {},
      source: "admin_manual",
    });

    expect(result).toEqual({
      subscriptionId: "subscription-new",
      transactionId: "transaction-1",
      mode: "replace-with-carry-over",
    });
    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      cancelReason: "replaced_by_admin_manual",
    });
    expect(mockedRevokeActiveAssignmentsBySubscriptionId).toHaveBeenCalledWith({
      subscriptionId: "subscription-old",
      revokeReason: "subscription_replaced",
    });
    expect(mockedCreateSubscriptionWithSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        packageId: "package-2",
        packageName: "Replacement Package",
        accessKeys: ["fxreplay:share", "tradingview:private"],
        source: "admin_manual",
        startAt: "2026-04-16T00:00:00.000Z",
        endAt: "2026-05-10T00:00:00.000Z",
      }),
    );
    expect(mockedAssignBestAssetForSubscription).toHaveBeenCalledTimes(2);
    expect(mockedCreateTransactionRow).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "subscription-new",
        packageId: "package-2",
        packageName: "Replacement Package",
        amountRp: 250000,
      }),
    );
  });

  it("cancels a running subscription and revokes its active assignments", async () => {
    const result = await cancelSubscription({ subscriptionId: "subscription-1" });

    expect(result).toEqual({ subscriptionId: "subscription-1" });
    expect(mockedGetSubscriptionById).toHaveBeenCalledWith("subscription-1");
    expect(mockedCancelSubscriptionRow).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      cancelReason: "admin_canceled",
    });
    expect(mockedRevokeActiveAssignmentsBySubscriptionId).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      revokeReason: "subscription_canceled",
    });
    expect(mockedCreateTransactionRow).not.toHaveBeenCalled();
  });
});
