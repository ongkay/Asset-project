import { beforeEach, describe, expect, it, vi } from "vitest";

const envMocks = vi.hoisted(() => ({
  EXT_API_DEV_HEADER_OVERRIDE: true,
  EXTENSION_ALLOWED_IDS: ["allowed-id"],
  EXTENSION_ALLOWED_ORIGINS: ["chrome-extension://allowed-id"],
  TRUSTED_PROXY_CITY_HEADER: "x-vercel-ip-city",
  TRUSTED_PROXY_COUNTRY_HEADER: "x-vercel-ip-country",
  TRUSTED_PROXY_IP_HEADER: "x-forwarded-for",
}));

const authRepositoryMocks = vi.hoisted(() => ({
  readProfileByUserId: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  signOutAndRevokeAppSession: vi.fn(),
}));

const cdKeyServiceMocks = vi.hoisted(() => ({
  redeemCdKey: vi.fn(),
}));

const consoleQueryMocks = vi.hoisted(() => ({
  getConsoleStateSnapshotByUserId: vi.fn(),
}));

const extRepositoryMocks = vi.hoisted(() => ({
  readExtAppConfig: vi.fn(),
  readExtAssetSecretByUserId: vi.fn(),
  readExtPlatformAccessByUserId: vi.fn(),
  readExtPurchasablePackages: vi.fn(),
  readExtRuntimeAssetByUserId: vi.fn(),
  readExtTradingViewOwnedLayoutRowsByUserId: vi.fn(),
  upsertExtHeartbeatByFingerprint: vi.fn(),
  writeExtTradingViewOwnedLayoutRows: vi.fn(),
}));

const requestMetadataMocks = vi.hoisted(() => ({
  readTrustedRequestMetadataFromHeaders: vi.fn(),
}));

const sessionServiceMocks = vi.hoisted(() => ({
  touchAppSessionLastSeen: vi.fn(),
  validateActiveAppSession: vi.fn(),
  validateAppSessionToken: vi.fn(),
}));

vi.mock("@/config/env.server", () => ({ env: envMocks }));
vi.mock("@/modules/auth/repositories", () => authRepositoryMocks);
vi.mock("@/modules/auth/services", () => authServiceMocks);
vi.mock("@/modules/cdkeys/services", () => cdKeyServiceMocks);
vi.mock("@/modules/console/queries", () => consoleQueryMocks);
vi.mock("@/modules/ext/repositories", () => extRepositoryMocks);
vi.mock("@/lib/request-metadata", () => requestMetadataMocks);
vi.mock("@/modules/sessions/services", () => sessionServiceMocks);

describe("ext/services bootstrap", () => {
  beforeEach(() => {
    envMocks.EXT_API_DEV_HEADER_OVERRIDE = true;
    envMocks.TRUSTED_PROXY_CITY_HEADER = "x-vercel-ip-city";
    envMocks.TRUSTED_PROXY_COUNTRY_HEADER = "x-vercel-ip-country";
    envMocks.TRUSTED_PROXY_IP_HEADER = "x-forwarded-for";
    authRepositoryMocks.readProfileByUserId.mockReset();
    authServiceMocks.signOutAndRevokeAppSession.mockReset();
    cdKeyServiceMocks.redeemCdKey.mockReset();
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockReset();
    extRepositoryMocks.readExtAppConfig.mockReset();
    extRepositoryMocks.readExtAssetSecretByUserId.mockReset();
    extRepositoryMocks.readExtPlatformAccessByUserId.mockReset();
    extRepositoryMocks.readExtPurchasablePackages.mockReset();
    extRepositoryMocks.readExtRuntimeAssetByUserId.mockReset();
    extRepositoryMocks.readExtTradingViewOwnedLayoutRowsByUserId.mockReset();
    extRepositoryMocks.upsertExtHeartbeatByFingerprint.mockReset();
    extRepositoryMocks.writeExtTradingViewOwnedLayoutRows.mockReset();
    extRepositoryMocks.readExtTradingViewOwnedLayoutRowsByUserId.mockResolvedValue([]);
    extRepositoryMocks.writeExtTradingViewOwnedLayoutRows.mockResolvedValue(undefined);
    requestMetadataMocks.readTrustedRequestMetadataFromHeaders.mockReset();
    sessionServiceMocks.touchAppSessionLastSeen.mockReset();
    sessionServiceMocks.validateActiveAppSession.mockReset();
    sessionServiceMocks.validateAppSessionToken.mockReset();
  });

  it("returns unauthenticated bootstrap when session lookup is empty", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue(null);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toEqual({
      auth: { loginUrl: "/login", status: "unauthenticated" },
      version: { status: "supported" },
    });
  });

  it("returns active bootstrap with platform access summary", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.1",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtAssetSecretByUserId.mockImplementation(({ mode }) =>
      Promise.resolve(mode === "private" ? { cookies: [], proxy: null } : { cookies: [], proxy: null }),
    );
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" },
    ]);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      assets: [{ mode: "private", platform: "tradingview" }],
      auth: { status: "authenticated" },
      subscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        packageName: "Starter",
        status: "active",
      },
      user: {
        avatarUrl: null,
        email: "seed.active@assetnext.dev",
        publicId: "MEM-001",
        username: "seed-active",
      },
      version: {
        downloadUrl: "https://github.com/example",
        latestVersion: "2.0.1",
        minimumVersion: "2.0.0",
        status: "update_available",
      },
    });
  });

  it("returns processed bootstrap with temporary tradingview share access while private stock is not ready", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.processed@assetnext.dev",
      isBanned: false,
      publicId: "MEM-004",
      role: "member",
      userId: "user-1",
      username: "seed-processed",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-processed",
        packageId: "pkg-processed",
        packageName: "Semi Private",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "processed",
      },
      state: "processed",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" },
      { hasPrivateAccess: false, hasShareAccess: true, platform: "fxtester" },
    ]);
    extRepositoryMocks.readExtAssetSecretByUserId.mockImplementation(({ mode, platform }) => {
      if (platform === "tradingview" && mode === "private") {
        return Promise.resolve(null);
      }

      return Promise.resolve({ cookies: [], proxy: null });
    });

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      assets: [
        { mode: "share", nextMode: "private", platform: "tradingview" },
        { mode: "share", platform: "fxtester" },
      ],
      auth: { status: "authenticated" },
      subscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        packageName: "Semi Private",
        status: "processed",
      },
      user: {
        avatarUrl: null,
        email: "seed.processed@assetnext.dev",
        publicId: "MEM-004",
        username: "seed-processed",
      },
      version: { status: "supported" },
    });
  });

  it("returns authenticated bootstrap with packages when subscription state is expired", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.expired@assetnext.dev",
      isBanned: false,
      publicId: "MEM-002",
      role: "member",
      userId: "user-1",
      username: "seed-expired",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2026-04-01T00:00:00.000Z",
        id: "sub-2",
        packageId: "pkg-2",
        packageName: "Starter",
        startAt: "2026-03-01T00:00:00.000Z",
        status: "expired",
      },
      state: "expired",
    });
    extRepositoryMocks.readExtPurchasablePackages.mockResolvedValue([
      {
        amountRp: 150000,
        checkoutUrl: "/paymentdummy?packageId=pkg-1",
        id: "pkg-1",
        name: "Starter",
        summary: "mixed",
      },
    ]);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      auth: { status: "authenticated" },
      packages: [{ id: "pkg-1" }],
      redeem: { enabled: true },
      subscription: {
        endAt: "2026-04-01T00:00:00.000Z",
        packageName: "Starter",
        status: "expired",
      },
      user: {
        avatarUrl: null,
        email: "seed.expired@assetnext.dev",
        publicId: "MEM-002",
        username: "seed-expired",
      },
      version: { status: "supported" },
    });
  });

  it("rejects banned users during bootstrap with EXT_USER_BANNED", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.banned@assetnext.dev",
      isBanned: true,
      publicId: "MEM-003",
      role: "member",
      userId: "user-1",
      username: "seed-banned",
    });

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_USER_BANNED" });
  });

  it("rejects requireExtSessionContext with EXT_UPDATE_REQUIRED when version is below minimum", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });

    const { requireExtSessionContext } = await import("@/modules/ext/services");

    await expect(
      requireExtSessionContext(
        new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
        { versionFallback: "1.9.9" },
      ),
    ).rejects.toMatchObject({ code: "EXT_UPDATE_REQUIRED" });
  });

  it("rejects requireExtSessionContext with EXT_UNAUTHENTICATED when session lookup is empty", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue(null);

    const { requireExtSessionContext } = await import("@/modules/ext/services");

    await expect(
      requireExtSessionContext(
        new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
        { versionFallback: "2.0.0" },
      ),
    ).rejects.toMatchObject({ code: "EXT_UNAUTHENTICATED" });
  });

  it("rejects requireExtSessionContext with EXT_UPDATE_REQUIRED when version is missing", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });

    const { requireExtSessionContext } = await import("@/modules/ext/services");

    await expect(
      requireExtSessionContext(
        new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
        { versionFallback: null },
      ),
    ).rejects.toMatchObject({ code: "EXT_UPDATE_REQUIRED" });
  });

  it("rejects requireExtSessionContext with EXT_USER_BANNED when session profile is banned", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.banned@assetnext.dev",
      isBanned: true,
      publicId: "MEM-003",
      role: "member",
      userId: "user-1",
      username: "seed-banned",
    });

    const { requireExtSessionContext } = await import("@/modules/ext/services");

    await expect(
      requireExtSessionContext(
        new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
        { versionFallback: null },
      ),
    ).rejects.toMatchObject({ code: "EXT_USER_BANNED" });
  });

  it("rejects malformed versions in bootstrap requests with EXT_REQUEST_INVALID", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.bad.0" },
        requestHeaders: new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_REQUEST_INVALID" });
  });

  it("rejects invalid asset queries with EXT_REQUEST_INVALID", async () => {
    const { getExtAssetResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetResponse({
        query: { platform: "windows" },
        requestHeaders: new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_REQUEST_INVALID" });
  });

  it("rejects invalid asset sync queries with EXT_REQUEST_INVALID", async () => {
    const { getExtAssetSyncResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetSyncResponse({
        query: { platform: "windows" },
        requestHeaders: new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_REQUEST_INVALID" });
  });

  it("uses standard headers and active-session lookup when dev override is disabled", async () => {
    envMocks.EXT_API_DEV_HEADER_OVERRIDE = false;
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateActiveAppSession.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([]);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          origin: "chrome-extension://allowed-id",
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "wrong-id",
          "x-ext-dev-origin": "chrome-extension://wrong-id",
          "x-extension-id": "allowed-id",
        }),
      }),
    ).resolves.toMatchObject({ auth: { status: "authenticated" }, version: { status: "supported" } });

    expect(sessionServiceMocks.validateActiveAppSession).toHaveBeenCalledTimes(1);
    expect(sessionServiceMocks.validateAppSessionToken).not.toHaveBeenCalled();

    envMocks.EXT_API_DEV_HEADER_OVERRIDE = true;
  });

  it("prefers x-extension-version over query, and query over fallback", async () => {
    extRepositoryMocks.readExtAppConfig
      .mockResolvedValueOnce({
        downloadUrl: "https://github.com/example",
        extensionKey: "asset-extension-v2",
        isActive: true,
        latestVersion: "3.0.0",
        minimumVersion: "2.5.0",
      })
      .mockResolvedValueOnce({
        downloadUrl: "https://github.com/example",
        extensionKey: "asset-extension-v2",
        isActive: true,
        latestVersion: "3.0.0",
        minimumVersion: "2.5.0",
      });

    const { assertExtRequestAllowed } = await import("@/modules/ext/services");

    await expect(
      assertExtRequestAllowed(
        new Headers({
          origin: "chrome-extension://allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-ext-dev-extension-id": "allowed-id",
          "x-extension-version": "3.0.0",
        }),
        { queryVersion: "2.6.0", versionFallback: "2.4.0" },
      ),
    ).resolves.toMatchObject({ versionStatus: { status: "supported" } });

    await expect(
      assertExtRequestAllowed(
        new Headers({
          origin: "chrome-extension://allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-ext-dev-extension-id": "allowed-id",
        }),
        { queryVersion: "2.6.0", versionFallback: "2.4.0" },
      ),
    ).resolves.toMatchObject({
      extension: { version: "2.6.0" },
      versionStatus: {
        downloadUrl: "https://github.com/example",
        latestVersion: "3.0.0",
        minimumVersion: "2.5.0",
        status: "update_available",
      },
    });
  });

  it("uses versionFallback when header and query versions are absent", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "3.0.0",
      minimumVersion: "2.5.0",
    });

    const { assertExtRequestAllowed } = await import("@/modules/ext/services");

    await expect(
      assertExtRequestAllowed(
        new Headers({
          origin: "chrome-extension://allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-ext-dev-extension-id": "allowed-id",
        }),
        { versionFallback: "2.4.0" },
      ),
    ).resolves.toMatchObject({
      extension: { version: "2.4.0" },
      versionStatus: {
        downloadUrl: "https://github.com/example",
        latestVersion: "3.0.0",
        minimumVersion: "2.5.0",
        status: "update_required",
      },
    });
  });

  it("returns a ready private tradingview asset when active access is available", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtAssetSecretByUserId.mockImplementation(({ mode }) => Promise.resolve(mode === "private"));
    extRepositoryMocks.readExtRuntimeAssetByUserId.mockResolvedValue({
      assetId: "asset-1",
      cookies: [],
      proxy: null,
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    const { getExtAssetResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetResponse({
        query: { platform: "tradingview" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({
      cookies: [],
      mode: "private",
      platform: "tradingview",
      proxy: null,
      revision: "extr1_JKcFk0my7uk_VleNzO3m4rmkHl8f9KLTIqoEx4OBXWY",
      status: "ready",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("changes asset revision when the effective payload changes even if asset identity is unchanged", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: true, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtAssetSecretByUserId.mockImplementation(({ mode }) => Promise.resolve(mode === "private"));
    extRepositoryMocks.readExtRuntimeAssetByUserId
      .mockResolvedValueOnce({
        assetId: "asset-1",
        cookies: [{ name: "sessionid", value: "secret-a" }],
        proxy: null,
        updatedAt: "2026-05-01T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        assetId: "asset-1",
        cookies: [{ name: "sessionid", value: "secret-b" }],
        proxy: null,
        updatedAt: "2026-05-01T00:00:00.000Z",
      });

    const { getExtAssetResponse } = await import("@/modules/ext/services");
    const firstResponse = await getExtAssetResponse({
      query: { platform: "tradingview" },
      requestHeaders: new Headers({
        "x-ext-dev-app-session": "opaque-token",
        "x-ext-dev-extension-id": "allowed-id",
        "x-ext-dev-origin": "chrome-extension://allowed-id",
        "x-extension-version": "2.0.0",
      }),
    });
    const secondResponse = await getExtAssetResponse({
      query: { platform: "tradingview" },
      requestHeaders: new Headers({
        "x-ext-dev-app-session": "opaque-token",
        "x-ext-dev-extension-id": "allowed-id",
        "x-ext-dev-origin": "chrome-extension://allowed-id",
        "x-extension-version": "2.0.0",
      }),
    });

    expect(firstResponse.status).toBe("ready");
    expect(secondResponse.status).toBe("ready");
    expect(firstResponse.revision).not.toBe(secondResponse.revision);
  });

  it("returns current from asset sync when the caller revision matches", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: false, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtAssetSecretByUserId.mockResolvedValue(true);
    extRepositoryMocks.readExtRuntimeAssetByUserId.mockResolvedValue({
      assetId: "asset-1",
      cookies: [],
      proxy: null,
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    const { getExtAssetSyncResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetSyncResponse({
        query: {
          platform: "tradingview",
          revision: "extr1_JKcFk0my7uk_VleNzO3m4rmkHl8f9KLTIqoEx4OBXWY",
        },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({
      mode: "private",
      platform: "tradingview",
      revision: "extr1_JKcFk0my7uk_VleNzO3m4rmkHl8f9KLTIqoEx4OBXWY",
      status: "current",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("returns stale missing_revision from asset sync when revision is blank", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: false, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtAssetSecretByUserId.mockResolvedValue(true);
    extRepositoryMocks.readExtRuntimeAssetByUserId.mockResolvedValue({
      assetId: "asset-1",
      cookies: [],
      proxy: null,
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    const { getExtAssetSyncResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetSyncResponse({
        query: { platform: "tradingview", revision: "   " },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({
      mode: "private",
      platform: "tradingview",
      reason: "missing_revision",
      revision: "extr1_JKcFk0my7uk_VleNzO3m4rmkHl8f9KLTIqoEx4OBXWY",
      status: "stale",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("returns stale revision_mismatch from asset sync when revision differs", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: false, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtAssetSecretByUserId.mockResolvedValue(true);
    extRepositoryMocks.readExtRuntimeAssetByUserId.mockResolvedValue({
      assetId: "asset-1",
      cookies: [],
      proxy: null,
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    const { getExtAssetSyncResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetSyncResponse({
        query: { platform: "tradingview", revision: "extr1_outdated" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({
      mode: "private",
      platform: "tradingview",
      reason: "revision_mismatch",
      revision: "extr1_JKcFk0my7uk_VleNzO3m4rmkHl8f9KLTIqoEx4OBXWY",
      status: "stale",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("returns forbidden from asset sync when the user has no active subscription access", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: null,
      state: "none",
    });

    const { getExtAssetSyncResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetSyncResponse({
        query: { platform: "tradingview" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({ reason: "subscription_required", status: "forbidden" });
  });

  it("rejects asset sync with EXT_UNAUTHENTICATED when session lookup is empty", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue(null);

    const { getExtAssetSyncResponse } = await import("@/modules/ext/services");

    await expect(
      getExtAssetSyncResponse({
        query: { platform: "tradingview" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).rejects.toMatchObject({ code: "EXT_UNAUTHENTICATED" });
  });

  it("normalizes browser and os to Unknown before writing a heartbeat row", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    requestMetadataMocks.readTrustedRequestMetadataFromHeaders.mockReturnValue({
      browser: null,
      host: null,
      ipAddress: "127.0.0.1",
      origin: "chrome-extension://allowed-id",
      os: null,
      protocol: "https",
    });
    extRepositoryMocks.upsertExtHeartbeatByFingerprint.mockResolvedValue({ id: "track-1" });

    const { createExtHeartbeatResponse } = await import("@/modules/ext/services");

    await expect(
      createExtHeartbeatResponse({
        body: { deviceId: "device-1", extensionVersion: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
          "x-forwarded-for": "127.0.0.1",
        }),
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(extRepositoryMocks.upsertExtHeartbeatByFingerprint).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: "Unknown",
        os: "Unknown",
        origin: "chrome-extension://allowed-id",
      }),
    );
  });

  it("maps a successful redeem result into bootstrap refresh payload", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    cdKeyServiceMocks.redeemCdKey.mockResolvedValue({ ok: true });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
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
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: true, hasShareAccess: false, platform: "tradingview" },
    ]);

    const { createExtRedeemResponse } = await import("@/modules/ext/services");

    await expect(
      createExtRedeemResponse({
        body: { code: "ABCD123456" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toMatchObject({
      bootstrap: expect.objectContaining({ auth: { status: "authenticated" } }),
      message: "CD-Key berhasil diredeem.",
      ok: true,
    });
  });

  it("maps logout payload through the auth sign-out service", async () => {
    authServiceMocks.signOutAndRevokeAppSession.mockResolvedValue({ ok: true, redirectTo: "/login" });
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });

    const { createExtLogoutResponse } = await import("@/modules/ext/services");

    await expect(
      createExtLogoutResponse({
        requestHeaders: new Headers({
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({ ok: true, redirectTo: "/login" });
  });

  it("surfaces redeem-failed as a server error instead of EXT_REDEEM_INVALID", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.0",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    cdKeyServiceMocks.redeemCdKey.mockResolvedValue({
      errorCode: "redeem-failed",
      message: "Redeem CD-Key gagal diproses. Silakan coba lagi.",
      ok: false,
    });

    const { createExtRedeemResponse } = await import("@/modules/ext/services");

    await expect(
      createExtRedeemResponse({
        body: { code: "ABCD123456" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).rejects.not.toMatchObject({ code: "EXT_REDEEM_INVALID" });
  });

  it("includes tradingview owned layouts in bootstrap for share users", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.1",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtAssetSecretByUserId.mockImplementation(({ mode }) =>
      Promise.resolve(mode === "share" ? { cookies: [], proxy: null } : null),
    );
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: false, hasShareAccess: true, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtTradingViewOwnedLayoutRowsByUserId.mockResolvedValue([
      {
        chart_id: "OWN123",
        last_opened_at: "2026-05-17T01:00:00.000Z",
        layout_updated_at: "2026-05-17T01:00:00.000Z",
        title: "Layout Sendiri",
        url: "https://www.tradingview.com/chart/OWN123/",
      },
    ]);

    const { getExtBootstrapResponse } = await import("@/modules/ext/services");

    await expect(
      getExtBootstrapResponse({
        query: { version: "2.0.0" },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
        }),
      }),
    ).resolves.toMatchObject({
      tradingViewOwnedLayouts: {
        lastOpenedAt: "2026-05-17T01:00:00.000Z",
        lastOpenedChartId: "OWN123",
        layouts: [
          {
            chartId: "OWN123",
            title: "Layout Sendiri",
            updatedAt: "2026-05-17T01:00:00.000Z",
            url: "https://www.tradingview.com/chart/OWN123/",
          },
        ],
      },
    });
  });

  it("persists active-only tradingview owned layout sync snapshots with hard delete semantics", async () => {
    extRepositoryMocks.readExtAppConfig.mockResolvedValue({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.1",
      minimumVersion: "2.0.0",
    });
    sessionServiceMocks.validateAppSessionToken.mockResolvedValue({ sessionId: "session-1", userId: "user-1" });
    authRepositoryMocks.readProfileByUserId.mockResolvedValue({
      avatarUrl: null,
      email: "seed.active@assetnext.dev",
      isBanned: false,
      publicId: "MEM-001",
      role: "member",
      userId: "user-1",
      username: "seed-active",
    });
    consoleQueryMocks.getConsoleStateSnapshotByUserId.mockResolvedValue({
      latestSubscription: {
        endAt: "2099-05-01T00:00:00.000Z",
        id: "sub-1",
        packageId: "pkg-1",
        packageName: "Starter",
        startAt: "2099-04-01T00:00:00.000Z",
        status: "active",
      },
      state: "active",
    });
    extRepositoryMocks.readExtAssetSecretByUserId.mockImplementation(({ mode }) =>
      Promise.resolve(mode === "share" ? { cookies: [], proxy: null } : null),
    );
    extRepositoryMocks.readExtPlatformAccessByUserId.mockResolvedValue([
      { hasPrivateAccess: false, hasShareAccess: true, platform: "tradingview" },
    ]);
    extRepositoryMocks.readExtTradingViewOwnedLayoutRowsByUserId.mockResolvedValue([
      {
        chart_id: "OWN123",
        last_opened_at: "2026-05-17T02:00:00.000Z",
        layout_updated_at: "2026-05-17T02:00:00.000Z",
        title: "Layout Baru",
        url: "https://www.tradingview.com/chart/OWN123/",
      },
    ]);

    const { syncExtTradingViewOwnedLayouts } = await import("@/modules/ext/services");

    await expect(
      syncExtTradingViewOwnedLayouts({
        body: {
          isAuthoritativeSnapshot: true,
          lastOpenedAt: "2026-05-17T02:00:00.000Z",
          lastOpenedChartId: "OWN123",
          layouts: [
            {
              chartId: "OWN123",
              title: "Layout Baru",
              updatedAt: "2026-05-17T02:00:00.000Z",
              url: "https://www.tradingview.com/chart/OWN123/",
            },
          ],
          snapshotCapturedAt: "2026-05-17T02:00:00.000Z",
          trigger: "tv_page_open",
        },
        requestHeaders: new Headers({
          "x-ext-dev-app-session": "opaque-token",
          "x-ext-dev-extension-id": "allowed-id",
          "x-ext-dev-origin": "chrome-extension://allowed-id",
          "x-extension-version": "2.0.0",
        }),
      }),
    ).resolves.toEqual({
      lastOpenedAt: "2026-05-17T02:00:00.000Z",
      lastOpenedChartId: "OWN123",
      layouts: [
        {
          chartId: "OWN123",
          title: "Layout Baru",
          updatedAt: "2026-05-17T02:00:00.000Z",
          url: "https://www.tradingview.com/chart/OWN123/",
        },
      ],
    });

    expect(extRepositoryMocks.writeExtTradingViewOwnedLayoutRows).toHaveBeenCalledWith({
      layouts: [
        {
          chartId: "OWN123",
          title: "Layout Baru",
          updatedAt: "2026-05-17T02:00:00.000Z",
          url: "https://www.tradingview.com/chart/OWN123/",
        },
      ],
      userId: "user-1",
      lastOpenedAt: "2026-05-17T02:00:00.000Z",
      lastOpenedChartId: "OWN123",
      snapshotCapturedAt: "2026-05-17T02:00:00.000Z",
    });
  });
});
