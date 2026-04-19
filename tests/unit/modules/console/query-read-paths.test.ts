import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createAuthenticatedInsForgeServerDatabase: vi.fn(),
  createInsForgeServerDatabase: vi.fn(),
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  readValidatedInsForgeAccessTokenForActiveAppSession: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  validateActiveAppSession: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createAuthenticatedInsForgeServerDatabase: databaseMocks.createAuthenticatedInsForgeServerDatabase,
  createInsForgeServerDatabase: databaseMocks.createInsForgeServerDatabase,
}));

vi.mock("@/modules/auth/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth/repositories")>("@/modules/auth/repositories");

  return {
    ...actual,
    readProfileByUserId: authRepositoryMocks.readProfileByUserId,
  };
});

vi.mock("@/modules/auth/services", () => ({
  readValidatedInsForgeAccessTokenForActiveAppSession:
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession,
}));

vi.mock("@/modules/sessions/services", async () => {
  const actual = await vi.importActual<typeof import("@/modules/sessions/services")>("@/modules/sessions/services");

  return {
    ...actual,
    validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
  };
});

describe("console query read paths", () => {
  beforeEach(() => {
    databaseMocks.createAuthenticatedInsForgeServerDatabase.mockReset();
    databaseMocks.createInsForgeServerDatabase.mockReset();
    authRepositoryMocks.readProfileByUserId.mockReset();
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();

    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("uses the authenticated server database path for getConsoleSnapshot", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        assets: [],
        subscription: null,
        transactions: [
          {
            amount_rp: 100000,
            created_at: "2026-04-07T09:45:22.805008+00:00",
            id: "93000000-0000-4000-8000-000000000008",
            package_id: "3cd291dd-5403-4417-8e9b-92d9ced54f8a",
            package_name: "Paket 3",
            paid_at: null,
            source: "payment_dummy",
            status: "pending",
          },
        ],
      },
      error: null,
    });

    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue("member-access-token");
    databaseMocks.createInsForgeServerDatabase.mockReturnValue({ rpc });

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot()).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [
        {
          amountRp: 100000,
          createdAt: "2026-04-07T09:45:22.805008+00:00",
          id: "93000000-0000-4000-8000-000000000008",
          packageId: "3cd291dd-5403-4417-8e9b-92d9ced54f8a",
          packageName: "Paket 3",
          paidAt: null,
          source: "payment_dummy",
          status: "pending",
        },
      ],
    });

    expect(databaseMocks.createInsForgeServerDatabase).toHaveBeenCalledTimes(1);
    expect(databaseMocks.createInsForgeServerDatabase).toHaveBeenCalledWith({ accessToken: "member-access-token" });
  });

  it("accepts legacy non-uuid asset ids from the console snapshot read model", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        assets: [
          {
            access_key: "tradingview:private",
            asset_type: "private",
            assignment_id: "11111111-1111-4111-8111-111111111111",
            expires_at: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            note: "Legacy asset key",
            platform: "tradingview",
            proxy: null,
            subscription_id: "22222222-2222-4222-8222-222222222222",
          },
        ],
        subscription: null,
        transactions: [],
      },
      error: null,
    });

    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue("member-access-token");
    databaseMocks.createInsForgeServerDatabase.mockReturnValue({ rpc });

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot()).resolves.toEqual({
      assets: [
        {
          accessKey: "tradingview:private",
          assetType: "private",
          assignmentId: "11111111-1111-4111-8111-111111111111",
          expiresAt: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          note: "Legacy asset key",
          platform: "tradingview",
          proxy: null,
          subscriptionId: "22222222-2222-4222-8222-222222222222",
        },
      ],
      subscription: null,
      transactions: [],
    });
  });

  it("returns an empty snapshot instead of throwing when the member token is unavailable", async () => {
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue(null);

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot()).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });

    expect(databaseMocks.createInsForgeServerDatabase).not.toHaveBeenCalled();
  });

  it("uses the authenticated server database path for getConsoleAssetDetail", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        access_key: "tradingview:private",
        account: "account-1",
        asset_json: { foo: "bar" },
        asset_type: "private",
        expires_at: "2026-05-01T00:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
        note: null,
        platform: "tradingview",
        proxy: null,
        subscription_id: "33333333-3333-4333-8333-333333333333",
      },
      error: null,
    });

    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue("member-access-token");
    databaseMocks.createInsForgeServerDatabase.mockReturnValue({ rpc });

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(getConsoleAssetDetail({ assetId: "22222222-2222-4222-8222-222222222222" })).resolves.toEqual({
      accessKey: "tradingview:private",
      account: "account-1",
      asset: { foo: "bar" },
      assetType: "private",
      expiresAt: "2026-05-01T00:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscriptionId: "33333333-3333-4333-8333-333333333333",
    });

    expect(databaseMocks.createInsForgeServerDatabase).toHaveBeenCalledTimes(1);
    expect(databaseMocks.createInsForgeServerDatabase).toHaveBeenCalledWith({ accessToken: "member-access-token" });
  });

  it("accepts canonical Postgres-style asset ids that do not satisfy zod uuid version checks", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        access_key: "tradingview:share",
        account: "seed-browser-tv-share-active@assetnext.dev",
        asset_json: [{ name: "session", value: "seed-browser-tv-active" }],
        asset_type: "share",
        expires_at: "2026-07-18T00:00:00.000Z",
        id: "20000000-0000-0000-0000-000000000003",
        note: "seed_tv_share_1",
        platform: "tradingview",
        proxy: "http://proxy.tv.share.1",
        subscription_id: "30000000-0000-0000-0000-000000000001",
      },
      error: null,
    });

    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue("member-access-token");
    databaseMocks.createInsForgeServerDatabase.mockReturnValue({ rpc });

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(getConsoleAssetDetail({ assetId: "20000000-0000-0000-0000-000000000003" })).resolves.toEqual({
      accessKey: "tradingview:share",
      account: "seed-browser-tv-share-active@assetnext.dev",
      asset: [{ name: "session", value: "seed-browser-tv-active" }],
      assetType: "share",
      expiresAt: "2026-07-18T00:00:00.000Z",
      id: "20000000-0000-0000-0000-000000000003",
      note: "seed_tv_share_1",
      platform: "tradingview",
      proxy: "http://proxy.tv.share.1",
      subscriptionId: "30000000-0000-0000-0000-000000000001",
    });
  });

  it("returns null for asset detail when the member token is unavailable", async () => {
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue(null);

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(getConsoleAssetDetail({ assetId: "22222222-2222-4222-8222-222222222222" })).resolves.toBeNull();

    expect(databaseMocks.createInsForgeServerDatabase).not.toHaveBeenCalled();
  });

  it("uses the authenticated server database path for getConsoleStateSnapshot", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        created_at: "2026-04-01T00:00:00.000Z",
        end_at: "2026-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        package_id: "55555555-5555-4555-8555-555555555555",
        package_name: "Paket 5",
        start_at: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      error: null,
    });
    const limit = vi.fn().mockReturnValue({ maybeSingle });
    const order = vi.fn().mockReturnValue({ limit });
    const eqUserId = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq: eqUserId });
    const from = vi.fn().mockReturnValue({ select });

    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue("member-access-token");
    databaseMocks.createInsForgeServerDatabase.mockReturnValue({ from });

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot()).resolves.toEqual({
      latestSubscription: {
        endAt: "2026-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        packageId: "55555555-5555-4555-8555-555555555555",
        packageName: "Paket 5",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });

    expect(authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession).toHaveBeenCalledTimes(1);
    expect(databaseMocks.createInsForgeServerDatabase).toHaveBeenCalledWith({ accessToken: "member-access-token" });
  });

  it("returns none for console state instead of throwing when the member token is unavailable", async () => {
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue(null);

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot()).resolves.toEqual({
      latestSubscription: null,
      state: "none",
    });

    expect(databaseMocks.createInsForgeServerDatabase).not.toHaveBeenCalled();
  });
});
