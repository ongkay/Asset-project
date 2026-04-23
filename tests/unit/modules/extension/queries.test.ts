import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  readExtensionAssetDetailRpc: vi.fn(),
  readExtensionAssetExistence: vi.fn(),
  readExtensionConsoleSnapshotRpc: vi.fn(),
}));

vi.mock("@/modules/extension/repositories", () => ({
  readExtensionAssetDetailRpc: repositoryMocks.readExtensionAssetDetailRpc,
  readExtensionAssetExistence: repositoryMocks.readExtensionAssetExistence,
  readExtensionConsoleSnapshotRpc: repositoryMocks.readExtensionConsoleSnapshotRpc,
}));

describe("extension queries", () => {
  beforeEach(() => {
    repositoryMocks.readExtensionAssetDetailRpc.mockReset();
    repositoryMocks.readExtensionAssetExistence.mockReset();
    repositoryMocks.readExtensionConsoleSnapshotRpc.mockReset();
  });

  it("maps the session snapshot from the trusted repository read model", async () => {
    repositoryMocks.readExtensionConsoleSnapshotRpc.mockResolvedValue({
      subscription: {
        days_left: 12,
        end_at: "2026-05-01T00:00:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        package_id: "22222222-2222-4222-8222-222222222222",
        package_name: "Starter",
        start_at: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [
        {
          access_key: "tradingview:private",
          asset_type: "private",
          assignment_id: "33333333-3333-4333-8333-333333333333",
          expires_at: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          note: null,
          platform: "tradingview",
          proxy: null,
          subscription_id: "11111111-1111-4111-8111-111111111111",
        },
      ],
      transactions: [],
    });

    const { getExtensionConsoleSnapshotForUser } = await import("@/modules/extension/queries");

    await expect(
      getExtensionConsoleSnapshotForUser({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    ).resolves.toEqual({
      subscription: {
        daysLeft: 12,
        endAt: "2026-05-01T00:00:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        packageId: "22222222-2222-4222-8222-222222222222",
        packageName: "Starter",
        startAt: "2026-04-01T00:00:00.000Z",
        status: "active",
      },
      assets: [
        {
          accessKey: "tradingview:private",
          assetType: "private",
          expiresAt: "2026-05-01T00:00:00.000Z",
          id: "TV-001",
          platform: "tradingview",
        },
      ],
    });
    expect(repositoryMocks.readExtensionConsoleSnapshotRpc).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("returns null when the trusted asset detail repository has no active row", async () => {
    repositoryMocks.readExtensionAssetDetailRpc.mockResolvedValue(null);

    const { getExtensionAssetDetailForUser } = await import("@/modules/extension/queries");

    await expect(
      getExtensionAssetDetailForUser({
        assetId: "20000000-0000-0000-0000-000000000003",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).resolves.toBeNull();
  });

  it("checks whether the requested asset id still exists in the inventory table", async () => {
    repositoryMocks.readExtensionAssetExistence.mockResolvedValue({ id: "20000000-0000-0000-0000-000000000003" });

    const { doesExtensionAssetExist } = await import("@/modules/extension/queries");

    await expect(doesExtensionAssetExist("20000000-0000-0000-0000-000000000003")).resolves.toBe(true);
  });
});
