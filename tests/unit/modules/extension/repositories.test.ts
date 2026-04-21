import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedCreateAuthenticatedInsForgeServerDatabase, mockedFrom, mockedRpc, mockedSelect } = vi.hoisted(() => ({
  mockedCreateAuthenticatedInsForgeServerDatabase: vi.fn(),
  mockedFrom: vi.fn(),
  mockedRpc: vi.fn(),
  mockedSelect: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createAuthenticatedInsForgeServerDatabase: mockedCreateAuthenticatedInsForgeServerDatabase,
}));

import {
  readExtensionAssetDetailRpc,
  readExtensionAssetExistence,
  readExtensionConsoleSnapshotRpc,
  upsertExtensionTrackHeartbeat,
} from "@/modules/extension/repositories";

describe("extension/repositories", () => {
  beforeEach(() => {
    mockedFrom.mockReset();
    mockedRpc.mockReset();
    mockedSelect.mockReset();
    mockedCreateAuthenticatedInsForgeServerDatabase.mockReset();

    mockedCreateAuthenticatedInsForgeServerDatabase.mockResolvedValue({
      from: mockedFrom,
      rpc: mockedRpc,
    });
  });

  it("uses the authenticated server database for console snapshot RPC reads", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: { assets: [], subscription: null, transactions: [] },
      error: null,
    });

    await expect(readExtensionConsoleSnapshotRpc("user-1")).resolves.toEqual({
      assets: [],
      subscription: null,
      transactions: [],
    });

    expect(mockedCreateAuthenticatedInsForgeServerDatabase).toHaveBeenCalledTimes(1);
    expect(mockedRpc).toHaveBeenCalledWith("get_user_console_snapshot", {
      p_user_id: "user-1",
    });
  });

  it("uses the authenticated server database for extension track upserts", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: {
        first_seen_at: "2026-04-21T00:00:00.000Z",
        id: "track-1",
        last_seen_at: "2026-04-21T00:00:00.000Z",
      },
      error: null,
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
      firstSeenAt: "2026-04-21T00:00:00.000Z",
      id: "track-1",
      lastSeenAt: "2026-04-21T00:00:00.000Z",
    });

    expect(mockedCreateAuthenticatedInsForgeServerDatabase).toHaveBeenCalledTimes(1);
  });

  it("uses the authenticated server database for asset lookup paths", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: { id: "asset-1" },
      error: null,
    });
    mockedFrom.mockReturnValue({
      select: mockedSelect,
    });
    mockedSelect.mockReturnValue({
      eq: () => ({
        maybeSingle: async () => ({
          data: { id: "asset-1" },
          error: null,
        }),
      }),
    });

    await expect(readExtensionAssetDetailRpc({ assetId: "asset-1", userId: "user-1" })).resolves.toEqual({
      id: "asset-1",
    });
    await expect(readExtensionAssetExistence("asset-1")).resolves.toEqual({ id: "asset-1" });

    expect(mockedCreateAuthenticatedInsForgeServerDatabase).toHaveBeenCalledTimes(2);
  });
});
