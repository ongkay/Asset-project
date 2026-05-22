import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

import {
  readExtAppConfig,
  readExtAssetSecretByUserId,
  readExtPlatformAccessByUserId,
  readExtPurchasablePackages,
  readExtRuntimeAssetByUserId,
  writeExtTradingViewOwnedLayoutRows,
  upsertExtHeartbeatByFingerprint,
} from "@/modules/ext/repositories";

describe("ext/repositories", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
  });

  it("reads the active version gate row by extension key", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        download_url: "https://github.com/example",
        extension_key: "asset-extension-v2",
        is_active: true,
        latest_version: "2.0.1",
        minimum_version: "2.0.0",
      },
      error: null,
    });
    const eqIsActive = vi.fn().mockReturnValue({ maybeSingle });
    const eqExtensionKey = vi.fn().mockReturnValue({ eq: eqIsActive });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqExtensionKey }),
      }),
    });

    await expect(readExtAppConfig("asset-extension-v2")).resolves.toEqual({
      downloadUrl: "https://github.com/example",
      extensionKey: "asset-extension-v2",
      isActive: true,
      latestVersion: "2.0.1",
      minimumVersion: "2.0.0",
    });

    expect(eqExtensionKey).toHaveBeenCalledWith("extension_key", "asset-extension-v2");
    expect(eqIsActive).toHaveBeenCalledWith("is_active", true);
  });

  it("summarizes active platform access from asset assignments", async () => {
    const isRevoked = vi.fn().mockResolvedValue({
      data: [
        { access_key: "tradingview:private", asset_platform: "tradingview" },
        { access_key: "tradingview:share", asset_platform: "tradingview" },
        { access_key: "fxtester:share", asset_platform: "fxtester" },
      ],
      error: null,
    });
    const eqUserId = vi.fn().mockReturnValue({ is: isRevoked });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqUserId }),
      }),
    });

    await expect(readExtPlatformAccessByUserId("user-1")).resolves.toEqual([
      {
        hasPrivateAccess: true,
        hasShareAccess: true,
        platform: "tradingview",
      },
      {
        hasPrivateAccess: false,
        hasShareAccess: true,
        platform: "fxtester",
      },
    ]);

    expect(eqUserId).toHaveBeenCalledWith("user_id", "user-1");
    expect(isRevoked).toHaveBeenCalledWith("revoked_at", null);
  });

  it("passes through full cookie payload and only strips id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        assets: {
          asset_json: [
            {
              domain: ".tradingview.com",
              hostOnly: false,
              httpOnly: false,
              id: 123,
              name: "sessionid",
              path: "/",
              sameSite: "no_restriction",
              secure: true,
              session: false,
              storeId: "0",
              value: "secret",
            },
          ],
          proxy: "http://proxy.local",
        },
      },
      error: null,
    });
    const isRevoked = vi.fn().mockReturnValue({ maybeSingle });
    const eqAccessKey = vi.fn().mockReturnValue({ is: isRevoked });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqAccessKey });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqUserId }),
      }),
    });

    await expect(
      readExtAssetSecretByUserId({ mode: "private", platform: "tradingview", userId: "user-1" }),
    ).resolves.toEqual({
      cookies: [
        {
          domain: ".tradingview.com",
          hostOnly: false,
          httpOnly: false,
          name: "sessionid",
          path: "/",
          sameSite: "no_restriction",
          secure: true,
          session: false,
          storeId: "0",
          value: "secret",
        },
      ],
      proxy: "http://proxy.local",
    });

    expect(eqUserId).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqAccessKey).toHaveBeenCalledWith("access_key", "tradingview:private");
    expect(isRevoked).toHaveBeenCalledWith("revoked_at", null);
  });

  it("preserves stored cookies exactly when optional fields are missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        assets: {
          asset_json: [
            {
              name: "sessionid",
              value: "secret",
            },
          ],
          proxy: "http://proxy.local",
        },
      },
      error: null,
    });
    const isRevoked = vi.fn().mockReturnValue({ maybeSingle });
    const eqAccessKey = vi.fn().mockReturnValue({ is: isRevoked });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqAccessKey });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqUserId }),
      }),
    });

    await expect(
      readExtAssetSecretByUserId({ mode: "share", platform: "tradingview", userId: "user-1" }),
    ).resolves.toEqual({
      cookies: [
        {
          name: "sessionid",
          value: "secret",
        },
      ],
      proxy: "http://proxy.local",
    });
  });

  it("returns empty cookie arrays unchanged", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        assets: {
          asset_json: [],
          proxy: null,
        },
      },
      error: null,
    });
    const isRevoked = vi.fn().mockReturnValue({ maybeSingle });
    const eqAccessKey = vi.fn().mockReturnValue({ is: isRevoked });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqAccessKey });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqUserId }),
      }),
    });

    await expect(
      readExtAssetSecretByUserId({ mode: "share", platform: "tradingview", userId: "user-1" }),
    ).resolves.toEqual({
      cookies: [],
      proxy: null,
    });
  });

  it("accepts runtime asset cookies with fractional expirationDate values", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        assets: {
          asset_json: [
            {
              expirationDate: 1760763275.369012,
              httpOnly: true,
              name: "sessionid",
              sameSite: "lax",
              secure: true,
              value: "secret",
            },
          ],
          proxy: "http://proxy.local",
        },
      },
      error: null,
    });
    const isRevoked = vi.fn().mockReturnValue({ maybeSingle });
    const eqAccessKey = vi.fn().mockReturnValue({ is: isRevoked });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqAccessKey });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqUserId }),
      }),
    });

    await expect(
      readExtAssetSecretByUserId({ mode: "private", platform: "tradingview", userId: "user-1" }),
    ).resolves.toEqual({
      cookies: [
        {
          expirationDate: 1760763275.369012,
          httpOnly: true,
          name: "sessionid",
          sameSite: "lax",
          secure: true,
          value: "secret",
        },
      ],
      proxy: "http://proxy.local",
    });
  });

  it("reads runtime asset metadata with updatedAt while still stripping cookie ids", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        assets: {
          asset_json: [
            {
              id: 88,
              name: "sessionid",
              value: "secret",
            },
          ],
          id: "asset-1",
          launch_url: "https://www.tradingview.com/chart/OWN123/",
          proxy: "http://proxy.local",
          updated_at: "2026-05-01T00:00:00.000Z",
        },
      },
      error: null,
    });
    const isRevoked = vi.fn().mockReturnValue({ maybeSingle });
    const eqAccessKey = vi.fn().mockReturnValue({ is: isRevoked });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqAccessKey });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqUserId }),
      }),
    });

    await expect(
      readExtRuntimeAssetByUserId({ mode: "private", platform: "tradingview", userId: "user-1" }),
    ).resolves.toEqual({
      assetId: "asset-1",
      cookies: [
        {
          name: "sessionid",
          value: "secret",
        },
      ],
      launchUrl: "https://www.tradingview.com/chart/OWN123/",
      proxy: "http://proxy.local",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("maps active packages into the ext checkout payload", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          access_keys_json: ["tradingview:private", "tradingview:share"],
          amount_rp: 300000,
          checkout_url: null,
          id: "pkg-1",
          name: "Mixed Package",
        },
        {
          access_keys_json: ["fxtester:share"],
          amount_rp: 120000,
          checkout_url: "https://checkout.local/fx",
          id: "pkg-2",
          name: "Share Package",
        },
      ],
      error: null,
    });
    const eqIsActive = vi.fn().mockReturnValue({ order });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqIsActive }),
      }),
    });

    await expect(readExtPurchasablePackages()).resolves.toEqual([
      {
        amountRp: 300000,
        checkoutUrl: "/checkout?packageId=pkg-1",
        id: "pkg-1",
        name: "Mixed Package",
        summary: "mixed",
      },
      {
        amountRp: 120000,
        checkoutUrl: "/checkout?packageId=pkg-2",
        id: "pkg-2",
        name: "Share Package",
        summary: "share",
      },
    ]);

    expect(eqIsActive).toHaveBeenCalledWith("is_active", true);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("writes owned layout snapshots with timestamp-guarded upserts and hard deletes", async () => {
    const readEqUserId = vi.fn().mockResolvedValue({
      data: [
        {
          chart_id: "OLD111",
          last_opened_at: null,
          layout_updated_at: "2026-05-17T01:00:00.000Z",
          title: "Layout Lama",
          url: "https://www.tradingview.com/chart/OLD111/",
        },
      ],
      error: null,
    });

    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    const deleteEqUserId = vi.fn().mockReturnValue({ in: deleteIn });
    const deleteRows = vi.fn().mockReturnValue({ eq: deleteEqUserId });

    const clearLastOpenedEqUserId = vi.fn().mockResolvedValue({ error: null });
    const clearLastOpened = vi.fn().mockReturnValue({ eq: clearLastOpenedEqUserId });

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: readEqUserId }) })
      .mockReturnValueOnce({ delete: deleteRows })
      .mockReturnValueOnce({ update: clearLastOpened });
    const rpc = vi.fn().mockResolvedValue({ error: null });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from, rpc });

    await expect(
      writeExtTradingViewOwnedLayoutRows({
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
        snapshotCapturedAt: "2026-05-17T02:05:00.000Z",
      }),
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenNthCalledWith(1, "upsert_extension_tradingview_layout", {
      p_chart_id: "OWN123",
      p_layout_updated_at: "2026-05-17T02:00:00.000Z",
      p_title: "Layout Baru",
      p_url: "https://www.tradingview.com/chart/OWN123/",
      p_user_id: "user-1",
    });
    expect(deleteEqUserId).toHaveBeenCalledWith("user_id", "user-1");
    expect(deleteIn).toHaveBeenCalledWith("chart_id", ["OLD111"]);
    expect(clearLastOpened).toHaveBeenCalledWith({ last_opened_at: null });
    expect(clearLastOpenedEqUserId).toHaveBeenCalledWith("user_id", "user-1");
    expect(rpc).toHaveBeenNthCalledWith(2, "set_extension_tradingview_last_opened", {
      p_chart_id: "OWN123",
      p_last_opened_at: "2026-05-17T02:00:00.000Z",
      p_user_id: "user-1",
    });
  });

  it("ignores stale owned layout snapshots before any destructive write runs", async () => {
    const readEqUserId = vi.fn().mockResolvedValue({
      data: [
        {
          chart_id: "OWN123",
          last_opened_at: "2026-05-17T03:05:00.000Z",
          layout_updated_at: "2026-05-17T03:00:00.000Z",
          title: "Layout Terbaru",
          url: "https://www.tradingview.com/chart/OWN123/",
        },
      ],
      error: null,
    });
    const from = vi.fn().mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: readEqUserId }) });
    const rpc = vi.fn();

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from, rpc });

    await expect(
      writeExtTradingViewOwnedLayoutRows({
        layouts: [
          {
            chartId: "OWN123",
            title: "Layout Lama",
            updatedAt: "2026-05-17T02:00:00.000Z",
            url: "https://www.tradingview.com/chart/OWN123/",
          },
        ],
        userId: "user-1",
        lastOpenedAt: "2026-05-17T02:05:00.000Z",
        lastOpenedChartId: "OWN123",
        snapshotCapturedAt: "2026-05-17T02:10:00.000Z",
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("updates last_seen_at when the full heartbeat fingerprint matches", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T11:00:00.000Z"));

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        first_seen_at: "2026-04-24T10:00:00.000Z",
        id: "track-1",
        last_seen_at: "2026-04-24T11:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqOs = vi.fn().mockReturnValue({ select });
    const eqBrowser = vi.fn().mockReturnValue({ eq: eqOs });
    const eqIpAddress = vi.fn().mockReturnValue({ eq: eqBrowser });
    const eqOrigin = vi.fn().mockReturnValue({ eq: eqIpAddress });
    const eqExtensionId = vi.fn().mockReturnValue({ eq: eqOrigin });
    const eqDeviceId = vi.fn().mockReturnValue({ eq: eqExtensionId });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqDeviceId });
    const update = vi.fn().mockReturnValue({ eq: eqUserId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    await expect(
      upsertExtHeartbeatByFingerprint({
        browser: "Chrome",
        city: "Bandung",
        country: "ID",
        deviceId: "device-1",
        extensionId: "allowed-id",
        extensionVersion: "2.0.0",
        ipAddress: "127.0.0.1",
        origin: "chrome-extension://allowed-id",
        os: "Linux",
        sessionId: "session-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      first_seen_at: "2026-04-24T10:00:00.000Z",
      id: "track-1",
      last_seen_at: "2026-04-24T11:00:00.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      city: "Bandung",
      country: "ID",
      extension_version: "2.0.0",
      last_seen_at: "2026-04-24T11:00:00.000Z",
      session_id: "session-1",
    });
    expect(eqOrigin).toHaveBeenCalledWith("origin", "chrome-extension://allowed-id");
    expect(eqIpAddress).toHaveBeenCalledWith("ip_address", "127.0.0.1");
    expect(eqBrowser).toHaveBeenCalledWith("browser", "Chrome");
    expect(eqOs).toHaveBeenCalledWith("os", "Linux");

    vi.useRealTimers();
  });

  it("inserts a new row when the heartbeat fingerprint changed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
    const updateEqOs = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqBrowser = vi.fn().mockReturnValue({ eq: updateEqOs });
    const updateEqIpAddress = vi.fn().mockReturnValue({ eq: updateEqBrowser });
    const updateEqOrigin = vi.fn().mockReturnValue({ eq: updateEqIpAddress });
    const updateEqExtensionId = vi.fn().mockReturnValue({ eq: updateEqOrigin });
    const updateEqDeviceId = vi.fn().mockReturnValue({ eq: updateEqExtensionId });
    const updateEqUserId = vi.fn().mockReturnValue({ eq: updateEqDeviceId });
    const update = vi.fn().mockReturnValue({ eq: updateEqUserId });

    const single = vi.fn().mockResolvedValue({
      data: {
        first_seen_at: "2026-04-24T12:00:00.000Z",
        id: "track-2",
        last_seen_at: "2026-04-24T12:00:00.000Z",
      },
      error: null,
    });
    const insertSelect = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });
    const from = vi.fn().mockReturnValueOnce({ update }).mockReturnValueOnce({ insert });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });

    await expect(
      upsertExtHeartbeatByFingerprint({
        browser: "Edge",
        city: null,
        country: null,
        deviceId: "device-1",
        extensionId: "allowed-id",
        extensionVersion: "2.0.1",
        ipAddress: "127.0.0.1",
        origin: "chrome-extension://allowed-id",
        os: "Windows",
        sessionId: "session-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      first_seen_at: "2026-04-24T12:00:00.000Z",
      id: "track-2",
      last_seen_at: "2026-04-24T12:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledWith([
      {
        browser: "Edge",
        city: null,
        country: null,
        device_id: "device-1",
        extension_id: "allowed-id",
        extension_version: "2.0.1",
        first_seen_at: "2026-04-24T12:00:00.000Z",
        ip_address: "127.0.0.1",
        last_seen_at: "2026-04-24T12:00:00.000Z",
        origin: "chrome-extension://allowed-id",
        os: "Windows",
        session_id: "session-1",
        user_id: "user-1",
      },
    ]);

    vi.useRealTimers();
  });

  it("retries the update path when concurrent insert hits the fingerprint unique constraint", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T13:00:00.000Z"));

    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
    const updateEqOs = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqBrowser = vi.fn().mockReturnValue({ eq: updateEqOs });
    const updateEqIpAddress = vi.fn().mockReturnValue({ eq: updateEqBrowser });
    const updateEqOrigin = vi.fn().mockReturnValue({ eq: updateEqIpAddress });
    const updateEqExtensionId = vi.fn().mockReturnValue({ eq: updateEqOrigin });
    const updateEqDeviceId = vi.fn().mockReturnValue({ eq: updateEqExtensionId });
    const updateEqUserId = vi.fn().mockReturnValue({ eq: updateEqDeviceId });
    const update = vi.fn().mockReturnValue({ eq: updateEqUserId });

    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    const racedUpdateMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        first_seen_at: "2026-04-24T12:59:59.000Z",
        id: "track-race",
        last_seen_at: "2026-04-24T13:00:00.000Z",
      },
      error: null,
    });
    const racedUpdateSelect = vi.fn().mockReturnValue({ maybeSingle: racedUpdateMaybeSingle });
    const racedUpdateEqOs = vi.fn().mockReturnValue({ select: racedUpdateSelect });
    const racedUpdateEqBrowser = vi.fn().mockReturnValue({ eq: racedUpdateEqOs });
    const racedUpdateEqIpAddress = vi.fn().mockReturnValue({ eq: racedUpdateEqBrowser });
    const racedUpdateEqOrigin = vi.fn().mockReturnValue({ eq: racedUpdateEqIpAddress });
    const racedUpdateEqExtensionId = vi.fn().mockReturnValue({ eq: racedUpdateEqOrigin });
    const racedUpdateEqDeviceId = vi.fn().mockReturnValue({ eq: racedUpdateEqExtensionId });
    const racedUpdateEqUserId = vi.fn().mockReturnValue({ eq: racedUpdateEqDeviceId });
    const racedUpdate = vi.fn().mockReturnValue({ eq: racedUpdateEqUserId });

    const from = vi
      .fn()
      .mockReturnValueOnce({ update })
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce({ update: racedUpdate });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });

    await expect(
      upsertExtHeartbeatByFingerprint({
        browser: "Chrome",
        city: "Bandung",
        country: "ID",
        deviceId: "device-race",
        extensionId: "allowed-id",
        extensionVersion: "2.0.2",
        ipAddress: "127.0.0.3",
        origin: "chrome-extension://allowed-id",
        os: "Linux",
        sessionId: "session-race",
        userId: "user-race",
      }),
    ).resolves.toEqual({
      first_seen_at: "2026-04-24T12:59:59.000Z",
      id: "track-race",
      last_seen_at: "2026-04-24T13:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(racedUpdateEqOrigin).toHaveBeenCalledWith("origin", "chrome-extension://allowed-id");
    expect(racedUpdateEqIpAddress).toHaveBeenCalledWith("ip_address", "127.0.0.3");
    expect(racedUpdateEqBrowser).toHaveBeenCalledWith("browser", "Chrome");
    expect(racedUpdateEqOs).toHaveBeenCalledWith("os", "Linux");

    vi.useRealTimers();
  });
});
