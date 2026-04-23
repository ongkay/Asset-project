import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

describe("console/repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("reads the console snapshot from trusted tables without calling RPCs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T00:00:00.000Z"));

    const rpc = vi.fn();

    const subscriptionsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          created_at: "2026-04-20T00:00:00.000Z",
          end_at: "2026-04-24T12:00:00.000Z",
          id: "subscription-active",
          package_id: "package-1",
          package_name: "Starter",
          start_at: "2026-04-01T00:00:00.000Z",
          status: "active",
        },
        {
          created_at: "2026-04-10T00:00:00.000Z",
          end_at: "2026-04-25T12:00:00.000Z",
          id: "subscription-processed",
          package_id: "package-2",
          package_name: "Share",
          start_at: "2026-04-05T00:00:00.000Z",
          status: "processed",
        },
      ],
      error: null,
    });
    const subscriptionsGt = vi.fn().mockReturnValue({ order: subscriptionsOrder });
    const subscriptionsIn = vi.fn().mockReturnValue({ gt: subscriptionsGt });
    const subscriptionsEq = vi.fn().mockReturnValue({ in: subscriptionsIn });
    const subscriptionsSelect = vi.fn().mockReturnValue({ eq: subscriptionsEq });

    const assignmentsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          access_key: "tradingview:private",
          asset_id: "asset-active",
          asset_platform: "tradingview",
          asset_type: "private",
          assigned_at: "2026-04-20T10:00:00.000Z",
          id: "assignment-1",
          subscription_id: "subscription-active",
        },
        {
          access_key: "fxreplay:share",
          asset_id: "asset-disabled",
          asset_platform: "fxreplay",
          asset_type: "share",
          assigned_at: "2026-04-19T10:00:00.000Z",
          id: "assignment-2",
          subscription_id: "subscription-processed",
        },
        {
          access_key: "fxtester:private",
          asset_id: "asset-canceled-subscription",
          asset_platform: "fxtester",
          asset_type: "private",
          assigned_at: "2026-04-18T10:00:00.000Z",
          id: "assignment-3",
          subscription_id: "subscription-canceled",
        },
      ],
      error: null,
    });
    const assignmentsIs = vi.fn().mockReturnValue({ order: assignmentsOrder });
    const assignmentsEq = vi.fn().mockReturnValue({ is: assignmentsIs });
    const assignmentsSelect = vi.fn().mockReturnValue({ eq: assignmentsEq });

    const transactionsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          amount_rp: 150000,
          code: "TRX-123",
          created_at: "2026-04-21T00:00:00.000Z",
          id: "transaction-1",
          package_id: "package-1",
          package_name: "Starter",
          paid_at: null,
          source: "payment_dummy",
          status: "pending",
        },
      ],
      error: null,
    });
    const transactionsEq = vi.fn().mockReturnValue({ order: transactionsOrder });
    const transactionsSelect = vi.fn().mockReturnValue({ eq: transactionsEq });

    const assetsIn = vi.fn().mockResolvedValue({
      data: [
        {
          disabled_at: null,
          expires_at: "2026-04-30T00:00:00.000Z",
          id: "asset-active",
          note: "Primary account",
          platform: "tradingview",
          proxy: "http://proxy.example",
          asset_type: "private",
        },
        {
          disabled_at: "2026-04-20T00:00:00.000Z",
          expires_at: "2026-04-30T00:00:00.000Z",
          id: "asset-disabled",
          note: "Disabled",
          platform: "fxreplay",
          proxy: null,
          asset_type: "share",
        },
      ],
      error: null,
    });
    const assetsSelect = vi.fn().mockReturnValue({ in: assetsIn });

    const from = vi.fn((table: string) => {
      if (table === "subscriptions") {
        return { select: subscriptionsSelect };
      }

      if (table === "asset_assignments") {
        return { select: assignmentsSelect };
      }

      if (table === "transactions") {
        return { select: transactionsSelect };
      }

      if (table === "assets") {
        return { select: assetsSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from, rpc });

    const { readConsoleSnapshotByUserId } = await import("@/modules/console/repositories");

    await expect(readConsoleSnapshotByUserId("user-1")).resolves.toEqual({
      assets: [
        {
          access_key: "tradingview:private",
          asset_type: "private",
          assignment_id: "assignment-1",
          expires_at: "2026-04-30T00:00:00.000Z",
          id: "asset-active",
          note: "Primary account",
          platform: "tradingview",
          proxy: "http://proxy.example",
          subscription_id: "subscription-active",
        },
      ],
      subscription: {
        days_left: 3,
        end_at: "2026-04-24T12:00:00.000Z",
        id: "subscription-active",
        package_id: "package-1",
        package_name: "Starter",
        start_at: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      transactions: [
        {
          amount_rp: 150000,
          code: "TRX-123",
          created_at: "2026-04-21T00:00:00.000Z",
          id: "transaction-1",
          package_id: "package-1",
          package_name: "Starter",
          paid_at: null,
          source: "payment_dummy",
          status: "pending",
        },
      ],
    });

    expect(rpc).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("subscriptions");
    expect(from).toHaveBeenCalledWith("asset_assignments");
    expect(from).toHaveBeenCalledWith("transactions");
    expect(from).toHaveBeenCalledWith("assets");
    expect(subscriptionsEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(subscriptionsIn).toHaveBeenCalledWith("status", ["active", "processed"]);
    expect(subscriptionsGt).toHaveBeenCalledWith("end_at", "2026-04-21T00:00:00.000Z");
    expect(assignmentsEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(assignmentsIs).toHaveBeenCalledWith("revoked_at", null);
    expect(transactionsEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(assetsIn).toHaveBeenCalledWith("id", ["asset-active", "asset-disabled"]);

    vi.useRealTimers();
  });

  it("reads asset detail from trusted tables using time-based expiry checks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T00:00:00.000Z"));

    const rpc = vi.fn();

    const assignmentOrder = vi.fn().mockResolvedValue({
      data: [
        {
          access_key: "tradingview:private",
          asset_id: "asset-1",
          asset_platform: "tradingview",
          asset_type: "private",
          subscription_id: "subscription-1",
        },
      ],
      error: null,
    });
    const assignmentIs = vi.fn().mockReturnValue({ order: assignmentOrder });
    const assignmentEqAssetId = vi.fn().mockReturnValue({ is: assignmentIs });
    const assignmentEqUserId = vi.fn().mockReturnValue({ eq: assignmentEqAssetId });
    const assignmentSelect = vi.fn().mockReturnValue({ eq: assignmentEqUserId });

    const subscriptionMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        end_at: "2026-04-20T23:00:01.000-01:00",
        id: "subscription-1",
        status: "active",
      },
      error: null,
    });
    const subscriptionEq = vi.fn().mockReturnValue({ maybeSingle: subscriptionMaybeSingle });
    const subscriptionSelect = vi.fn().mockReturnValue({ eq: subscriptionEq });

    const assetMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        account: "member@example.com",
        asset_json: { cookies: [] },
        asset_type: "private",
        disabled_at: null,
        expires_at: "2026-04-20T23:00:02.000-01:00",
        id: "asset-1",
        note: "Primary account",
        platform: "tradingview",
        proxy: "http://proxy.example",
      },
      error: null,
    });
    const assetEq = vi.fn().mockReturnValue({ maybeSingle: assetMaybeSingle });
    const assetSelect = vi.fn().mockReturnValue({ eq: assetEq });

    const from = vi.fn((table: string) => {
      if (table === "asset_assignments") {
        return { select: assignmentSelect };
      }

      if (table === "subscriptions") {
        return { select: subscriptionSelect };
      }

      if (table === "assets") {
        return { select: assetSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from, rpc });

    const { readConsoleAssetDetailByUserId } = await import("@/modules/console/repositories");

    await expect(readConsoleAssetDetailByUserId({ assetId: "asset-1", userId: "user-1" })).resolves.toEqual({
      access_key: "tradingview:private",
      account: "member@example.com",
      asset_json: { cookies: [] },
      asset_type: "private",
      expires_at: "2026-04-20T23:00:02.000-01:00",
      id: "asset-1",
      note: "Primary account",
      platform: "tradingview",
      proxy: "http://proxy.example",
      subscription_id: "subscription-1",
    });

    expect(rpc).not.toHaveBeenCalled();
    expect(assignmentEqUserId).toHaveBeenCalledWith("user_id", "user-1");
    expect(assignmentEqAssetId).toHaveBeenCalledWith("asset_id", "asset-1");
    expect(assignmentIs).toHaveBeenCalledWith("revoked_at", null);
    expect(subscriptionEq).toHaveBeenCalledWith("id", "subscription-1");
    expect(assetEq).toHaveBeenCalledWith("id", "asset-1");

    vi.useRealTimers();
  });

  it("skips newer invalid assignments and uses assignment snapshot platform fields for asset detail", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T00:00:00.000Z"));

    const rpc = vi.fn();

    const assignmentOrder = vi.fn().mockResolvedValue({
      data: [
        {
          access_key: "tradingview:private",
          asset_id: "asset-1",
          asset_platform: "tradingview",
          asset_type: "private",
          subscription_id: "subscription-expired",
        },
        {
          access_key: "legacy:share",
          asset_id: "asset-1",
          asset_platform: "fxreplay",
          asset_type: "share",
          subscription_id: "subscription-valid",
        },
      ],
      error: null,
    });
    const assignmentIs = vi.fn().mockReturnValue({ order: assignmentOrder });
    const assignmentEqAssetId = vi.fn().mockReturnValue({ is: assignmentIs });
    const assignmentEqUserId = vi.fn().mockReturnValue({ eq: assignmentEqAssetId });
    const assignmentSelect = vi.fn().mockReturnValue({ eq: assignmentEqUserId });

    const subscriptionMaybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          end_at: "2026-04-20T00:00:00.000Z",
          id: "subscription-expired",
          status: "active",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          end_at: "2026-04-25T00:00:00.000Z",
          id: "subscription-valid",
          status: "processed",
        },
        error: null,
      });
    const subscriptionEq = vi.fn().mockReturnValue({ maybeSingle: subscriptionMaybeSingle });
    const subscriptionSelect = vi.fn().mockReturnValue({ eq: subscriptionEq });

    const assetMaybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          account: "member@example.com",
          asset_json: { cookies: ["abc"] },
          asset_type: "private",
          disabled_at: null,
          expires_at: "2026-04-30T00:00:00.000Z",
          id: "asset-1",
          note: "Primary account",
          platform: "tradingview",
          proxy: "http://proxy.example",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          account: "member@example.com",
          asset_json: { cookies: ["abc"] },
          asset_type: "private",
          disabled_at: null,
          expires_at: "2026-04-30T00:00:00.000Z",
          id: "asset-1",
          note: "Primary account",
          platform: "tradingview",
          proxy: "http://proxy.example",
        },
        error: null,
      });
    const assetEq = vi.fn().mockReturnValue({ maybeSingle: assetMaybeSingle });
    const assetSelect = vi.fn().mockReturnValue({ eq: assetEq });

    const from = vi.fn((table: string) => {
      if (table === "asset_assignments") {
        return { select: assignmentSelect };
      }

      if (table === "subscriptions") {
        return { select: subscriptionSelect };
      }

      if (table === "assets") {
        return { select: assetSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from, rpc });

    const { readConsoleAssetDetailByUserId } = await import("@/modules/console/repositories");

    await expect(readConsoleAssetDetailByUserId({ assetId: "asset-1", userId: "user-1" })).resolves.toEqual({
      access_key: "legacy:share",
      account: "member@example.com",
      asset_json: { cookies: ["abc"] },
      asset_type: "share",
      expires_at: "2026-04-30T00:00:00.000Z",
      id: "asset-1",
      note: "Primary account",
      platform: "fxreplay",
      proxy: "http://proxy.example",
      subscription_id: "subscription-valid",
    });

    expect(assignmentIs).toHaveBeenCalledWith("revoked_at", null);
    expect(subscriptionEq).toHaveBeenCalledTimes(2);
    expect(assetEq).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
