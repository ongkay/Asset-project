import { beforeEach, describe, expect, it, vi } from "vitest";

const consoleRepositoryMocks = vi.hoisted(() => ({
  readConsoleAssetDetailByUserId: vi.fn(),
  readConsoleSnapshotByUserId: vi.fn(),
}));

const databaseMocks = vi.hoisted(() => ({
  createAuthenticatedInsForgeServerDatabase: vi.fn(),
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/modules/console/repositories", () => ({
  readConsoleAssetDetailByUserId: consoleRepositoryMocks.readConsoleAssetDetailByUserId,
  readConsoleSnapshotByUserId: consoleRepositoryMocks.readConsoleSnapshotByUserId,
}));

vi.mock("@/lib/insforge/database", () => ({
  createAuthenticatedInsForgeServerDatabase: databaseMocks.createAuthenticatedInsForgeServerDatabase,
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
}));

import {
  readExtensionAssetDetailRpc,
  readExtensionAssetExistence,
  readExtensionConsoleSnapshotRpc,
  upsertExtensionTrackHeartbeat,
} from "@/modules/extension/repositories";

function expectTrustedAdminDatabaseOnly() {
  expect(databaseMocks.createAuthenticatedInsForgeServerDatabase).not.toHaveBeenCalled();
}

describe("extension/repositories", () => {
  beforeEach(() => {
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockReset();
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockReset();
    databaseMocks.createInsForgeAdminDatabase.mockReset();
    databaseMocks.createAuthenticatedInsForgeServerDatabase.mockReset();
  });

  it("reads the console snapshot through the trusted table-backed console repository", async () => {
    consoleRepositoryMocks.readConsoleSnapshotByUserId.mockResolvedValue({
      assets: [],
      subscription: null,
      transactions: [],
    });

    await expect(readExtensionConsoleSnapshotRpc("user-1")).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });

    expect(consoleRepositoryMocks.readConsoleSnapshotByUserId).toHaveBeenCalledWith("user-1");
    expect(databaseMocks.createInsForgeAdminDatabase).not.toHaveBeenCalled();
    expectTrustedAdminDatabaseOnly();
  });

  it("updates an existing extension heartbeat row through trusted table writes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        first_seen_at: "2026-04-20T10:00:00.000Z",
        id: "track-1",
        last_seen_at: "2026-04-21T10:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqExtensionId = vi.fn().mockReturnValue({ select });
    const eqIpAddress = vi.fn().mockReturnValue({ eq: eqExtensionId });
    const eqDeviceId = vi.fn().mockReturnValue({ eq: eqIpAddress });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqDeviceId });
    const update = vi.fn().mockReturnValue({ eq: eqUserId });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });

    await expect(
      upsertExtensionTrackHeartbeat({
        heartbeat: {
          browser: "Chrome",
          deviceId: "device-1",
          extensionId: "allowed-id",
          extensionVersion: "0.0.1",
          os: "Linux",
          sessionId: "session-1",
          userId: "user-1",
        },
        network: {
          city: "Bandung",
          country: "ID",
          ipAddress: "127.0.0.1",
        },
      }),
    ).resolves.toEqual({
      firstSeenAt: "2026-04-20T10:00:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-21T10:00:00.000Z",
    });

    expect(databaseMocks.createInsForgeAdminDatabase).toHaveBeenCalledTimes(1);
    expectTrustedAdminDatabaseOnly();
    expect(update).toHaveBeenCalledWith({
      browser: "Chrome",
      city: "Bandung",
      country: "ID",
      extension_version: "0.0.1",
      last_seen_at: "2026-04-21T10:00:00.000Z",
      os: "Linux",
      session_id: "session-1",
    });
    expect(eqUserId).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqDeviceId).toHaveBeenCalledWith("device_id", "device-1");
    expect(eqIpAddress).toHaveBeenCalledWith("ip_address", "127.0.0.1");
    expect(eqExtensionId).toHaveBeenCalledWith("extension_id", "allowed-id");

    vi.useRealTimers();
  });

  it("inserts a new extension heartbeat row when no existing identity row is found", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T11:00:00.000Z"));

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle });
    const eqExtensionId = vi.fn().mockReturnValue({ select: updateSelect });
    const eqIpAddress = vi.fn().mockReturnValue({ eq: eqExtensionId });
    const eqDeviceId = vi.fn().mockReturnValue({ eq: eqIpAddress });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqDeviceId });
    const update = vi.fn().mockReturnValue({ eq: eqUserId });

    const single = vi.fn().mockResolvedValue({
      data: {
        first_seen_at: "2026-04-21T11:00:00.000Z",
        id: "track-2",
        last_seen_at: "2026-04-21T11:00:00.000Z",
      },
      error: null,
    });
    const insertSelect = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert, update }),
    });

    await expect(
      upsertExtensionTrackHeartbeat({
        heartbeat: {
          browser: null,
          deviceId: "device-2",
          extensionId: "allowed-id",
          extensionVersion: "0.0.2",
          os: null,
          sessionId: "session-2",
          userId: "user-2",
        },
        network: {
          city: null,
          country: null,
          ipAddress: "127.0.0.2",
        },
      }),
    ).resolves.toEqual({
      firstSeenAt: "2026-04-21T11:00:00.000Z",
      id: "track-2",
      lastSeenAt: "2026-04-21T11:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledWith([
      {
        browser: null,
        city: null,
        country: null,
        device_id: "device-2",
        extension_id: "allowed-id",
        extension_version: "0.0.2",
        first_seen_at: "2026-04-21T11:00:00.000Z",
        ip_address: "127.0.0.2",
        last_seen_at: "2026-04-21T11:00:00.000Z",
        os: null,
        session_id: "session-2",
        user_id: "user-2",
      },
    ]);

    vi.useRealTimers();
  });

  it("retries the trusted update path when concurrent first insert hits the unique constraint", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    const updateMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
    const updateEqExtensionId = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqIpAddress = vi.fn().mockReturnValue({ eq: updateEqExtensionId });
    const updateEqDeviceId = vi.fn().mockReturnValue({ eq: updateEqIpAddress });
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
        first_seen_at: "2026-04-21T11:59:59.000Z",
        id: "track-race",
        last_seen_at: "2026-04-21T12:00:00.000Z",
      },
      error: null,
    });
    const racedUpdateSelect = vi.fn().mockReturnValue({ maybeSingle: racedUpdateMaybeSingle });
    const racedUpdateEqExtensionId = vi.fn().mockReturnValue({ select: racedUpdateSelect });
    const racedUpdateEqIpAddress = vi.fn().mockReturnValue({ eq: racedUpdateEqExtensionId });
    const racedUpdateEqDeviceId = vi.fn().mockReturnValue({ eq: racedUpdateEqIpAddress });
    const racedUpdateEqUserId = vi.fn().mockReturnValue({ eq: racedUpdateEqDeviceId });
    const racedUpdate = vi.fn().mockReturnValue({ eq: racedUpdateEqUserId });

    const from = vi
      .fn()
      .mockReturnValueOnce({ update })
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce({ update: racedUpdate });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });

    await expect(
      upsertExtensionTrackHeartbeat({
        heartbeat: {
          browser: "Chrome",
          deviceId: "device-race",
          extensionId: "allowed-id",
          extensionVersion: "0.0.3",
          os: "Linux",
          sessionId: "session-race",
          userId: "user-race",
        },
        network: {
          city: "Bandung",
          country: "ID",
          ipAddress: "127.0.0.3",
        },
      }),
    ).resolves.toEqual({
      firstSeenAt: "2026-04-21T11:59:59.000Z",
      id: "track-race",
      lastSeenAt: "2026-04-21T12:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(racedUpdateEqUserId).toHaveBeenCalledWith("user_id", "user-race");
    expect(racedUpdateEqDeviceId).toHaveBeenCalledWith("device_id", "device-race");
    expect(racedUpdateEqIpAddress).toHaveBeenCalledWith("ip_address", "127.0.0.3");
    expect(racedUpdateEqExtensionId).toHaveBeenCalledWith("extension_id", "allowed-id");

    vi.useRealTimers();
  });

  it("reads extension asset detail through the trusted table-backed console repository", async () => {
    consoleRepositoryMocks.readConsoleAssetDetailByUserId.mockResolvedValue({
      access_key: "tradingview:private",
      account: "member@example.com",
      asset_json: { cookies: [] },
      asset_type: "private",
      expires_at: "2026-04-30T00:00:00.000Z",
      id: "asset-1",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscription_id: "subscription-1",
    });

    await expect(readExtensionAssetDetailRpc({ assetId: "asset-1", userId: "user-1" })).resolves.toEqual({
      access_key: "tradingview:private",
      account: "member@example.com",
      asset_json: { cookies: [] },
      asset_type: "private",
      expires_at: "2026-04-30T00:00:00.000Z",
      id: "asset-1",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscription_id: "subscription-1",
    });

    expect(consoleRepositoryMocks.readConsoleAssetDetailByUserId).toHaveBeenCalledWith({
      assetId: "asset-1",
      userId: "user-1",
    });
    expect(databaseMocks.createInsForgeAdminDatabase).not.toHaveBeenCalled();
    expectTrustedAdminDatabaseOnly();
  });

  it("uses the trusted admin database for global asset existence probes", async () => {
    const mockedMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "asset-1" },
      error: null,
    });
    const mockedEq = vi.fn().mockReturnValue({
      maybeSingle: mockedMaybeSingle,
    });

    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockedEq }),
    });

    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({ from });

    await expect(readExtensionAssetExistence("asset-1")).resolves.toEqual({ id: "asset-1" });

    expect(databaseMocks.createInsForgeAdminDatabase).toHaveBeenCalledTimes(1);
    expectTrustedAdminDatabaseOnly();
    expect(from).toHaveBeenCalledWith("assets");
    expect(mockedEq).toHaveBeenCalledWith("id", "asset-1");
    expect(mockedMaybeSingle).toHaveBeenCalledTimes(1);
  });
});
