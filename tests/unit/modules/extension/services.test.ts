import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  readAppSessionCookie: vi.fn(),
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  signOutAndRevokeAppSession: vi.fn(),
}));

const consoleQueryMocks = vi.hoisted(() => ({
  getConsoleStateSnapshot: vi.fn(),
}));

const extensionQueryMocks = vi.hoisted(() => ({
  doesExtensionAssetExist: vi.fn(),
  getExtensionAssetDetailForUser: vi.fn(),
  getExtensionConsoleSnapshotForUser: vi.fn(),
}));

const extensionRepositoryMocks = vi.hoisted(() => ({
  upsertExtensionTrackHeartbeat: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  createSessionBoundRequestNonce: vi.fn(),
  touchActiveAppSessionLastSeen: vi.fn(),
  validateActiveAppSession: vi.fn(),
  verifySessionBoundRequestNonce: vi.fn(),
}));

vi.mock("@/config/env.server", () => ({
  env: {
    EXTENSION_ALLOWED_IDS: ["allowed-id"],
    EXTENSION_ALLOWED_ORIGINS: ["chrome-extension://allowed-id"],
    TRUSTED_PROXY_CITY_HEADER: "x-vercel-ip-city",
    TRUSTED_PROXY_COUNTRY_HEADER: "x-vercel-ip-country",
    TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
  },
}));

vi.mock("@/lib/cookies", () => ({
  readAppSessionCookie: cookieMocks.readAppSessionCookie,
}));

vi.mock("@/modules/auth/repositories", () => ({
  readProfileByUserId: authRepositoryMocks.readProfileByUserId,
}));

vi.mock("@/modules/auth/services", () => ({
  signOutAndRevokeAppSession: authServiceMocks.signOutAndRevokeAppSession,
}));

vi.mock("@/modules/console/queries", () => ({
  getConsoleStateSnapshot: consoleQueryMocks.getConsoleStateSnapshot,
}));

vi.mock("@/modules/extension/queries", () => ({
  doesExtensionAssetExist: extensionQueryMocks.doesExtensionAssetExist,
  getExtensionAssetDetailForUser: extensionQueryMocks.getExtensionAssetDetailForUser,
  getExtensionConsoleSnapshotForUser: extensionQueryMocks.getExtensionConsoleSnapshotForUser,
}));

vi.mock("@/modules/extension/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/modules/extension/repositories")>(
    "@/modules/extension/repositories",
  );

  return {
    ...actual,
    upsertExtensionTrackHeartbeat: extensionRepositoryMocks.upsertExtensionTrackHeartbeat,
  };
});

vi.mock("@/modules/sessions/services", async () => {
  const actual = await vi.importActual<typeof import("@/modules/sessions/services")>("@/modules/sessions/services");

  return {
    ...actual,
    createSessionBoundRequestNonce: sessionServiceMocks.createSessionBoundRequestNonce,
    touchActiveAppSessionLastSeen: sessionServiceMocks.touchActiveAppSessionLastSeen,
    validateActiveAppSession: sessionServiceMocks.validateActiveAppSession,
    verifySessionBoundRequestNonce: sessionServiceMocks.verifySessionBoundRequestNonce,
  };
});

describe("extension services", () => {
  beforeEach(() => {
    cookieMocks.readAppSessionCookie.mockReset();
    authRepositoryMocks.readProfileByUserId.mockReset();
    authServiceMocks.signOutAndRevokeAppSession.mockReset();
    consoleQueryMocks.getConsoleStateSnapshot.mockReset();
    extensionQueryMocks.doesExtensionAssetExist.mockReset();
    extensionQueryMocks.getExtensionAssetDetailForUser.mockReset();
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockReset();
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockReset();
    sessionServiceMocks.createSessionBoundRequestNonce.mockReset();
    sessionServiceMocks.touchActiveAppSessionLastSeen.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();
    sessionServiceMocks.verifySessionBoundRequestNonce.mockReset();
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
  });

  it("throws SESSION_MISSING when the browser has no app_session cookie", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue(undefined);
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "SESSION_MISSING" });
  });

  it("throws SESSION_REVOKED when the cookie exists but the active session row is gone", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "SESSION_REVOKED" });
  });

  it("throws EXT_ORIGIN_DENIED when the extension id is not allowlisted", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://denied-id",
          "x-extension-id": "denied-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_ORIGIN_DENIED" });
  });

  it("rejects extension logout when x-extension-id header is missing", async () => {
    const { createExtensionLogoutResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionLogoutResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_HEADER_REQUIRED" });
  });

  it("rejects extension logout when the extension origin is not allowlisted", async () => {
    const { createExtensionLogoutResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionLogoutResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://denied-id",
          "x-extension-id": "denied-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_ORIGIN_DENIED" });
  });

  it("accepts allowlisted extension requests when service-worker fetch omits the Origin header", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [{ id: "asset-1" }],
      subscription: {
        daysLeft: 10,
        endAt: "2026-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "active",
      },
    });
    sessionServiceMocks.createSessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-05-01T00:00:00.000Z",
      value: "nonce-1",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      requestNonce: {
        value: "nonce-1",
      },
      user: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    });
  });

  it("throws USER_BANNED before any extension data is read", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: true,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "USER_BANNED" });

    expect(extensionQueryMocks.getExtensionConsoleSnapshotForUser).not.toHaveBeenCalled();
  });

  it.each([
    {
      expectedSubscription: {
        assets: [],
        daysLeft: 0,
        endAt: null,
        packageName: null,
        status: "none",
      },
      stateSnapshot: {
        latestSubscription: null,
        state: "none",
      },
    },
    {
      expectedSubscription: {
        assets: [],
        daysLeft: 0,
        endAt: "2026-03-01T00:00:00.000Z",
        packageName: "Starter",
        status: "expired",
      },
      stateSnapshot: {
        latestSubscription: {
          endAt: "2026-03-01T00:00:00.000Z",
          id: "sub-1",
          packageId: "pkg-1",
          packageName: "Starter",
          startAt: "2026-02-01T00:00:00.000Z",
          status: "expired",
        },
        state: "expired",
      },
    },
    {
      expectedSubscription: {
        assets: [],
        daysLeft: 0,
        endAt: "2026-03-01T00:00:00.000Z",
        packageName: "Starter",
        status: "canceled",
      },
      stateSnapshot: {
        latestSubscription: {
          endAt: "2026-03-01T00:00:00.000Z",
          id: "sub-1",
          packageId: "pkg-1",
          packageName: "Starter",
          startAt: "2026-02-01T00:00:00.000Z",
          status: "canceled",
        },
        state: "canceled",
      },
    },
  ])(
    "builds a successful extension session payload without asset access for $expectedSubscription.status users",
    async ({ expectedSubscription, stateSnapshot }) => {
      cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
      sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
        sessionId: "session-1",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      });
      authRepositoryMocks.readProfileByUserId.mockResolvedValue({
        avatarUrl: null,
        email: "seed.none.browser@assetnext.dev",
        isBanned: false,
        publicId: "MEM-001",
        role: "member",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        username: "seed-none-browser",
      });
      extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
        assets: [
          {
            accessKey: "tradingview:private",
            assetType: "private",
            expiresAt: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            platform: "tradingview",
          },
        ],
        subscription: null,
      });
      consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue(stateSnapshot);

      const { getExtensionSessionResponse } = await import("@/modules/extension/services");

      await expect(
        getExtensionSessionResponse({
          requestHeaders: new Headers({
            origin: "chrome-extension://allowed-id",
            "x-extension-id": "allowed-id",
          }),
        }),
      ).resolves.toEqual({
        subscription: expectedSubscription,
        user: {
          email: "seed.none.browser@assetnext.dev",
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          publicId: "MEM-001",
          username: "seed-none-browser",
        },
      });

      expect(sessionServiceMocks.createSessionBoundRequestNonce).not.toHaveBeenCalled();
    },
  );

  it("builds the extension session payload for an active user", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [
        {
          accessKey: "tradingview:private",
          assetType: "private",
          expiresAt: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          platform: "tradingview",
        },
      ],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
    });
    sessionServiceMocks.createSessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      value: "nonce-1",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      requestNonce: {
        expiresAt: "2026-04-21T13:01:00.000Z",
        value: "nonce-1",
      },
      subscription: {
        assets: [
          {
            accessKey: "tradingview:private",
            assetType: "private",
            expiresAt: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            platform: "tradingview",
          },
        ],
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "active",
      },
      user: {
        email: "seed.active.browser@assetnext.dev",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        publicId: "MEM-001",
        username: "seed-active-browser",
      },
    });
  });

  it("builds the extension session payload for a processed user with assets and request nonce", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.processed.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-processed-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [
        {
          accessKey: "tradingview:private",
          assetType: "private",
          expiresAt: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          platform: "tradingview",
        },
      ],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "processed",
      },
    });
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "processed",
      },
      state: "processed",
    });
    sessionServiceMocks.createSessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      value: "nonce-1",
    });

    const { getExtensionSessionResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionSessionResponse({
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      requestNonce: {
        expiresAt: "2026-04-21T13:01:00.000Z",
        value: "nonce-1",
      },
      subscription: {
        assets: [
          {
            accessKey: "tradingview:private",
            assetType: "private",
            expiresAt: "2026-05-01T00:00:00.000Z",
            id: "TV-001",
            platform: "tradingview",
          },
        ],
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "processed",
      },
      user: {
        email: "seed.processed.browser@assetnext.dev",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        publicId: "MEM-001",
        username: "seed-processed-browser",
      },
    });
  });

  it("allows extension tracking for logged-in users even when asset access is expired", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [],
      subscription: null,
    });
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-03-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-02-01T00:00:00.000Z",
        status: "expired",
      },
      state: "expired",
    });
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockResolvedValue({
      firstSeenAt: "2026-04-21T13:05:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-21T13:05:00.000Z",
    });

    const { createExtensionTrackResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionTrackResponse({
        heartbeat: {
          browser: "Chrome",
          deviceId: "m11-allowed-primary",
          extensionVersion: "0.0.1",
          os: "macOS",
        },
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      success: true,
      timestamp: expect.any(String),
    });
  });

  it("keeps extension asset access strict for expired users", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [],
      subscription: null,
    });
    consoleQueryMocks.getConsoleStateSnapshot.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-03-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-02-01T00:00:00.000Z",
        status: "expired",
      },
      state: "expired",
    });

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "TV-001",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_EXPIRED" });

    expect(sessionServiceMocks.verifySessionBoundRequestNonce).not.toHaveBeenCalled();
  });

  it("builds the raw asset response after nonce verification", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
    });
    sessionServiceMocks.verifySessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    extensionQueryMocks.getExtensionAssetDetailForUser.mockResolvedValue({
      accessKey: "tradingview:private",
      account: "seed-account",
      asset: [{ name: "session", value: "cookie-1" }],
      assetType: "private",
      expiresAt: "2026-05-01T00:00:00.000Z",
      id: "TV-001",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscriptionId: "sub-1",
    });

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "TV-001",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      accessKey: "tradingview:private",
      account: "seed-account",
      asset: [{ name: "session", value: "cookie-1" }],
      assetType: "private",
      expiresAt: "2026-05-01T00:00:00.000Z",
      id: "TV-001",
      note: null,
      platform: "tradingview",
      proxy: null,
    });
  });

  it("returns ASSET_NOT_ALLOWED when the asset row exists but is not readable for the active subscription", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
    });
    sessionServiceMocks.verifySessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    extensionQueryMocks.getExtensionAssetDetailForUser.mockResolvedValue(null);
    extensionQueryMocks.doesExtensionAssetExist.mockResolvedValue(true);

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "TV-001",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_ALLOWED" });
  });

  it("returns NOT_FOUND when the asset id does not exist at all", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
    });
    sessionServiceMocks.verifySessionBoundRequestNonce.mockResolvedValue({
      expiresAt: "2026-04-21T13:01:00.000Z",
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    extensionQueryMocks.getExtensionAssetDetailForUser.mockResolvedValue(null);
    extensionQueryMocks.doesExtensionAssetExist.mockResolvedValue(false);

    const { getExtensionAssetResponse } = await import("@/modules/extension/services");

    await expect(
      getExtensionAssetResponse({
        assetId: "missing-asset",
        nonce: "nonce-1",
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("uses x-extension-id from the request header when writing extension_tracks", async () => {
    cookieMocks.readAppSessionCookie.mockResolvedValue("opaque-token");
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({
      sessionId: "session-1",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active.browser@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "seed-active-browser",
    });
    extensionQueryMocks.getExtensionConsoleSnapshotForUser.mockResolvedValue({
      assets: [],
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
    });
    extensionRepositoryMocks.upsertExtensionTrackHeartbeat.mockResolvedValue({
      firstSeenAt: "2026-04-21T13:05:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-21T13:05:00.000Z",
    });

    const { createExtensionTrackResponse } = await import("@/modules/extension/services");

    await expect(
      createExtensionTrackResponse({
        heartbeat: {
          browser: "Chrome",
          deviceId: "m11-allowed-primary",
          extensionVersion: "0.0.1",
          os: "macOS",
        },
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toEqual({
      success: true,
      timestamp: expect.any(String),
    });

    expect(extensionRepositoryMocks.upsertExtensionTrackHeartbeat).toHaveBeenCalledWith({
      heartbeat: {
        browser: "Chrome",
        deviceId: "m11-allowed-primary",
        extensionId: "allowed-id",
        extensionVersion: "0.0.1",
        os: "macOS",
        sessionId: "session-1",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      network: expect.objectContaining({
        ipAddress: expect.any(String),
      }),
    });
  });
});
