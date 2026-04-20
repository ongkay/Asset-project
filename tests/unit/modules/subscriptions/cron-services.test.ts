import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/packages/services", () => ({
  getMemberPurchasablePackageById: vi.fn(),
  getPackageById: vi.fn(),
  toPackageActivationSnapshot: vi.fn(),
}));

vi.mock("@/modules/transactions/services", () => ({
  attachTransactionToSubscription: vi.fn(),
  createTransaction: vi.fn(),
  failTransaction: vi.fn(),
  succeedTransaction: vi.fn(),
}));

vi.mock("@/modules/assets/services", () => ({
  createAsset: vi.fn(),
}));

vi.mock("@/modules/subscriptions/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/subscriptions/repositories")>(
    "@/modules/subscriptions/repositories",
  );

  return {
    ...actual,
    runExpireSubscriptionsJobRpc: vi.fn(),
    runReconcileInvalidAssetsJobRpc: vi.fn(),
  };
});

import * as subscriptionRepositories from "@/modules/subscriptions/repositories";
import { runExpireSubscriptionsCronJob, runReconcileInvalidAssetsCronJob } from "@/modules/subscriptions/services";

const mockedRunExpireSubscriptionsJobRpc = vi.mocked(subscriptionRepositories.runExpireSubscriptionsJobRpc);
const mockedRunReconcileInvalidAssetsJobRpc = vi.mocked(subscriptionRepositories.runReconcileInvalidAssetsJobRpc);

describe("subscriptions/cron services", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
    mockedRunExpireSubscriptionsJobRpc.mockReset();
    mockedRunReconcileInvalidAssetsJobRpc.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the expire subscriptions cron result payload", async () => {
    mockedRunExpireSubscriptionsJobRpc.mockResolvedValue(2);

    await expect(runExpireSubscriptionsCronJob()).resolves.toEqual({
      ok: true,
      job: "expire-subscriptions",
      processedCount: 2,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });

  it("returns the reconcile invalid assets cron result payload", async () => {
    mockedRunReconcileInvalidAssetsJobRpc.mockResolvedValue(3);

    await expect(runReconcileInvalidAssetsCronJob()).resolves.toEqual({
      ok: true,
      job: "reconcile-invalid-assets",
      processedCount: 3,
      executedAt: "2026-04-20T12:00:00.000Z",
    });
  });
});
