import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  revokeActiveAssignmentsBySubscriptionId: vi.fn(),
  updateSubscriptionWindow: vi.fn(),
}));

vi.mock("@/modules/assets/services", () => ({
  createAsset: vi.fn(),
}));

import * as subscriptionRepositories from "@/modules/subscriptions/repositories";
import {
  activateSubscriptionManually,
  buildQuickAddAssetInput,
  cancelSubscription,
} from "@/modules/subscriptions/services";

import type { SubscriptionPackageSnapshot, SubscriptionRow } from "@/modules/subscriptions/types";

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
const mockedRevokeActiveAssignmentsBySubscriptionId = vi.mocked(
  subscriptionRepositories.revokeActiveAssignmentsBySubscriptionId,
);
const mockedUpdateSubscriptionWindow = vi.mocked(subscriptionRepositories.updateSubscriptionWindow);

function createPackageSnapshot(overrides: Partial<SubscriptionPackageSnapshot> = {}): SubscriptionPackageSnapshot {
  return {
    packageId: "package-1",
    name: "Premium Package",
    amountRp: 150000,
    durationDays: 30,
    isExtended: true,
    accessKeys: ["tradingview:private"],
    ...overrides,
  };
}

function createSubscriptionRow(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: "subscription-1",
    userId: "user-1",
    packageId: "package-1",
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
    mockedRevokeActiveAssignmentsBySubscriptionId.mockResolvedValue({ count: 0 });
    mockedUpdateSubscriptionWindow.mockResolvedValue(createSubscriptionRow({ endAt: "2026-05-05T00:00:00.000Z" }));
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
      existingRunningSubscriptionId: "subscription-1",
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
        packageId: "package-1",
        packageName: "Premium Package",
        source: "admin_manual",
        status: "success",
        amountRp: 150000,
      }),
    );
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
      existingRunningSubscriptionId: "subscription-old",
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
