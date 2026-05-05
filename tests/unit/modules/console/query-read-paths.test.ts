import { beforeEach, describe, expect, it, vi } from "vitest";

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const consoleRepositoryMocks = vi.hoisted(() => ({
  readConsoleAssetDetailByUserId: vi.fn(),
  readConsoleSnapshotByUserId: vi.fn(),
  readLatestConsoleSubscriptionByUserId: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  validateActiveAppSession: vi.fn(),
}));

vi.mock("@/modules/auth/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth/repositories")>("@/modules/auth/repositories");

  return {
    ...actual,
    readProfileByUserId: authRepositoryMocks.readProfileByUserId,
  };
});

vi.mock("@/modules/console/repositories", () => ({
  readConsoleAssetDetailByUserId: consoleRepositoryMocks.readConsoleAssetDetailByUserId,
  readConsoleSnapshotByUserId: consoleRepositoryMocks.readConsoleSnapshotByUserId,
  readLatestConsoleSubscriptionByUserId: consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId,
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
    authRepositoryMocks.readProfileByUserId.mockReset();
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockReset();
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockReset();
    consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();

    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("reads the member console snapshot via trusted repository using the active session user id", async () => {
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockResolvedValue({
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
    });

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

    expect(consoleRepositoryMocks.readConsoleSnapshotByUserId).toHaveBeenCalledTimes(1);
    expect(consoleRepositoryMocks.readConsoleSnapshotByUserId).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(authRepositoryMocks.readProfileByUserId).not.toHaveBeenCalled();
  });

  it("accepts legacy non-uuid asset ids from the console snapshot read model", async () => {
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockResolvedValue({
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
    });

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

  it("accepts canonical transaction ids that do not satisfy zod uuid version checks", async () => {
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockResolvedValue({
      assets: [],
      subscription: null,
      transactions: [
        {
          amount_rp: 100000,
          created_at: "2026-04-06T09:45:22.805008+00:00",
          id: "50000000-0000-0000-0000-000000000004",
          package_id: "3cd291dd-5403-4417-8e9b-92d9ced54f8a",
          package_name: "Paket 3",
          paid_at: null,
          source: "payment_dummy",
          status: "success",
        },
      ],
    });

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot()).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [
        {
          amountRp: 100000,
          createdAt: "2026-04-06T09:45:22.805008+00:00",
          id: "50000000-0000-0000-0000-000000000004",
          packageId: "3cd291dd-5403-4417-8e9b-92d9ced54f8a",
          packageName: "Paket 3",
          paidAt: null,
          source: "payment_dummy",
          status: "success",
        },
      ],
    });
  });

  it("returns an empty snapshot when there is no active app session", async () => {
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot()).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });

    expect(consoleRepositoryMocks.readConsoleSnapshotByUserId).not.toHaveBeenCalled();
  });

  it("reads member asset detail via trusted repository using the active session user id", async () => {
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockResolvedValue({
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
    });

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

    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).toHaveBeenCalledTimes(1);
    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).toHaveBeenCalledWith({
      assetId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("accepts canonical Postgres-style asset ids that do not satisfy zod uuid version checks", async () => {
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockResolvedValue({
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
    });

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

  it("accepts legacy non-canonical asset ids for asset detail reads", async () => {
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockResolvedValue({
      access_key: "tradingview:private",
      account: "legacy-account",
      asset_json: { legacy: true },
      asset_type: "private",
      expires_at: "2026-07-18T00:00:00.000Z",
      id: "TV-001",
      note: "Legacy detail",
      platform: "tradingview",
      proxy: null,
      subscription_id: "30000000-0000-0000-0000-000000000001",
    });

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(getConsoleAssetDetail({ assetId: "TV-001" })).resolves.toEqual({
      accessKey: "tradingview:private",
      account: "legacy-account",
      asset: { legacy: true },
      assetType: "private",
      expiresAt: "2026-07-18T00:00:00.000Z",
      id: "TV-001",
      note: "Legacy detail",
      platform: "tradingview",
      proxy: null,
      subscriptionId: "30000000-0000-0000-0000-000000000001",
    });

    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).toHaveBeenCalledWith({
      assetId: "TV-001",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("returns null for truly invalid asset detail ids", async () => {
    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(getConsoleAssetDetail({ assetId: "" })).resolves.toBeNull();

    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).not.toHaveBeenCalled();
  });

  it("returns null for asset detail when there is no active app session", async () => {
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(getConsoleAssetDetail({ assetId: "22222222-2222-4222-8222-222222222222" })).resolves.toBeNull();

    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).not.toHaveBeenCalled();
  });

  it("reads the latest console subscription via trusted repository using the active session user id", async () => {
    consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId.mockResolvedValue({
      created_at: "2026-04-01T00:00:00.000Z",
      end_at: "2099-05-01T00:00:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      package_id: "55555555-5555-4555-8555-555555555555",
      package_name: "Paket 5",
      start_at: "2026-04-01T00:00:00.000Z",
      status: "active",
    });

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot()).resolves.toEqual({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        packageId: "55555555-5555-4555-8555-555555555555",
        packageName: "Paket 5",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });

    expect(consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("reads console state directly by explicit user id without requiring an active session", async () => {
    consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId.mockResolvedValue({
      created_at: "2026-04-01T00:00:00.000Z",
      end_at: "2099-05-01T00:00:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      package_id: "55555555-5555-4555-8555-555555555555",
      package_name: "Paket 5",
      start_at: "2026-04-01T00:00:00.000Z",
      status: "active",
    });

    const { getConsoleStateSnapshotByUserId } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshotByUserId("99999999-9999-4999-8999-999999999999")).resolves.toEqual({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        packageId: "55555555-5555-4555-8555-555555555555",
        packageName: "Paket 5",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });

    expect(sessionServiceMocks.validateActiveAppSession).not.toHaveBeenCalled();
    expect(consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("accepts canonical subscription ids that do not satisfy zod uuid version checks in console state reads", async () => {
    consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId.mockResolvedValue({
      created_at: "2026-04-01T00:00:00.000Z",
      end_at: "2026-04-18T00:00:00.000Z",
      id: "40000000-0000-0000-0000-000000000004",
      package_id: "55555555-5555-4555-8555-555555555555",
      package_name: "Paket Legacy",
      start_at: "2026-03-19T00:00:00.000Z",
      status: "active",
    });

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot()).resolves.toEqual({
      latestSubscription: {
        endAt: "2026-04-18T00:00:00.000Z",
        id: "40000000-0000-0000-0000-000000000004",
        packageId: "55555555-5555-4555-8555-555555555555",
        packageName: "Paket Legacy",
        startAt: "2026-03-19T00:00:00.000Z",
        status: "expired",
      },
      state: "expired",
    });
  });

  it("returns none for console state when there is no active app session", async () => {
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot()).resolves.toEqual({
      latestSubscription: null,
      state: "none",
    });

    expect(consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId).not.toHaveBeenCalled();
  });

  it("allows an admin to read another user's snapshot", async () => {
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockResolvedValue({
      assets: [],
      subscription: null,
      transactions: [],
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "admin" });

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot({ userId: "99999999-9999-4999-8999-999999999999" })).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });

    expect(authRepositoryMocks.readProfileByUserId).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(consoleRepositoryMocks.readConsoleSnapshotByUserId).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("rejects non-admin attempts to read another user's snapshot", async () => {
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "member" });

    const { getConsoleSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleSnapshot({ userId: "99999999-9999-4999-8999-999999999999" })).rejects.toThrow(
      "Admin access is required to read another user's console snapshot.",
    );

    expect(consoleRepositoryMocks.readConsoleSnapshotByUserId).not.toHaveBeenCalled();
  });

  it("allows an admin to read another user's asset detail", async () => {
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockResolvedValue({
      access_key: "tradingview:private",
      account: "admin-read-account",
      asset_json: { ok: true },
      asset_type: "private",
      expires_at: "2026-05-01T00:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscription_id: "33333333-3333-4333-8333-333333333333",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "admin" });

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(
      getConsoleAssetDetail({
        assetId: "22222222-2222-4222-8222-222222222222",
        userId: "99999999-9999-4999-8999-999999999999",
      }),
    ).resolves.toEqual({
      accessKey: "tradingview:private",
      account: "admin-read-account",
      asset: { ok: true },
      assetType: "private",
      expiresAt: "2026-05-01T00:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscriptionId: "33333333-3333-4333-8333-333333333333",
    });

    expect(authRepositoryMocks.readProfileByUserId).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).toHaveBeenCalledWith({
      assetId: "22222222-2222-4222-8222-222222222222",
      userId: "99999999-9999-4999-8999-999999999999",
    });
  });

  it("rejects non-admin attempts to read another user's asset detail", async () => {
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "member" });

    const { getConsoleAssetDetail } = await import("@/modules/console/queries");

    await expect(
      getConsoleAssetDetail({
        assetId: "22222222-2222-4222-8222-222222222222",
        userId: "99999999-9999-4999-8999-999999999999",
      }),
    ).rejects.toThrow("Admin access is required to read another user's console snapshot.");

    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).not.toHaveBeenCalled();
  });

  it("allows an admin to read another user's console state", async () => {
    consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId.mockResolvedValue({
      created_at: "2026-04-01T00:00:00.000Z",
      end_at: "2099-05-01T00:00:00.000Z",
      id: "44444444-4444-4444-8444-444444444444",
      package_id: "55555555-5555-4555-8555-555555555555",
      package_name: "Paket 5",
      start_at: "2026-04-01T00:00:00.000Z",
      status: "active",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "admin" });

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot({ userId: "99999999-9999-4999-8999-999999999999" })).resolves.toEqual({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        packageId: "55555555-5555-4555-8555-555555555555",
        packageName: "Paket 5",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });

    expect(authRepositoryMocks.readProfileByUserId).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("rejects non-admin attempts to read another user's console state", async () => {
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({ role: "member" });

    const { getConsoleStateSnapshot } = await import("@/modules/console/queries");

    await expect(getConsoleStateSnapshot({ userId: "99999999-9999-4999-8999-999999999999" })).rejects.toThrow(
      "Admin access is required to read another user's console snapshot.",
    );

    expect(consoleRepositoryMocks.readLatestConsoleSubscriptionByUserId).not.toHaveBeenCalled();
  });
});
