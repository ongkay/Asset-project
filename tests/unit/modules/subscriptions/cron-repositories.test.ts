import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

vi.mock("@/modules/assets/repositories", () => ({
  listAssetStatusesByIds: vi.fn(),
}));

describe("subscriptions/cron repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("resolves expire_subscriptions_job rpc result count", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { runExpireSubscriptionsJobRpc } = await import("@/modules/subscriptions/repositories");

    await expect(runExpireSubscriptionsJobRpc()).resolves.toBe(2);
    expect(rpc).toHaveBeenCalledWith("expire_subscriptions_job");
  });

  it("resolves reconcile_invalid_assets_job rpc result count", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 5, error: null });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ rpc });

    const { runReconcileInvalidAssetsJobRpc } = await import("@/modules/subscriptions/repositories");

    await expect(runReconcileInvalidAssetsJobRpc()).resolves.toBe(5);
    expect(rpc).toHaveBeenCalledWith("reconcile_invalid_assets_job");
  });
});
