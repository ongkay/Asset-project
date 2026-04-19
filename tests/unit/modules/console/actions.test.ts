import { beforeEach, describe, expect, it, vi } from "vitest";

const userServiceMocks = vi.hoisted(() => ({
  getAuthenticatedAppUser: vi.fn(),
}));

const consoleQueryMocks = vi.hoisted(() => ({
  getConsoleAssetDetail: vi.fn(),
}));

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: userServiceMocks.getAuthenticatedAppUser,
}));

vi.mock("@/modules/console/queries", () => ({
  getConsoleAssetDetail: consoleQueryMocks.getConsoleAssetDetail,
}));

describe("console/actions", () => {
  beforeEach(() => {
    userServiceMocks.getAuthenticatedAppUser.mockReset();
    consoleQueryMocks.getConsoleAssetDetail.mockReset();

    userServiceMocks.getAuthenticatedAppUser.mockResolvedValue({
      profile: {
        avatarUrl: null,
        email: "member@example.com",
        isBanned: false,
        publicId: "MEM-000001",
        role: "member",
        userId: "91000000-0000-4000-8000-000000000001",
        username: "member-user",
      },
      session: {
        expiresAt: "2026-05-01T00:00:00.000Z",
        id: "session-1",
        userId: "91000000-0000-4000-8000-000000000001",
      },
    });
  });

  it("returns asset detail from the member-guarded server action", async () => {
    consoleQueryMocks.getConsoleAssetDetail.mockResolvedValueOnce({
      accessKey: "tradingview:private",
      account: "member-account",
      asset: { session: "abc" },
      assetType: "private",
      expiresAt: "2026-05-10T00:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      note: null,
      platform: "tradingview",
      proxy: null,
      subscriptionId: "33333333-3333-4333-8333-333333333333",
    });

    const { getConsoleAssetDetailAction } = await import("@/modules/console/actions");
    const result = await getConsoleAssetDetailAction({
      assetId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result?.data).toEqual({
      detail: {
        accessKey: "tradingview:private",
        account: "member-account",
        asset: { session: "abc" },
        assetType: "private",
        expiresAt: "2026-05-10T00:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
        note: null,
        platform: "tradingview",
        proxy: null,
        subscriptionId: "33333333-3333-4333-8333-333333333333",
      },
      uiMessage: null,
    });
    expect(consoleQueryMocks.getConsoleAssetDetail).toHaveBeenCalledWith({
      assetId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns the accepted unavailable state when the asset no longer exists", async () => {
    consoleQueryMocks.getConsoleAssetDetail.mockResolvedValueOnce(null);

    const { getConsoleAssetDetailAction } = await import("@/modules/console/actions");
    const result = await getConsoleAssetDetailAction({
      assetId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result?.data).toEqual({
      detail: null,
      uiMessage: "Asset sudah tidak tersedia.",
    });
  });

  it("rejects a blank asset id before calling the query layer", async () => {
    const { getConsoleAssetDetailAction } = await import("@/modules/console/actions");
    const result = await getConsoleAssetDetailAction({
      assetId: "   ",
    });

    expect(result?.validationErrors?.fieldErrors.assetId).toContain("Asset ID is required.");
    expect(consoleQueryMocks.getConsoleAssetDetail).not.toHaveBeenCalled();
  });
});
