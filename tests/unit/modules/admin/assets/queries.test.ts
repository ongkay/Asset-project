import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/assets/repositories", () => ({
  getAssetById: vi.fn(),
  getAssetStatusById: vi.fn(),
  listActiveAssetIdsByUserIds: vi.fn(),
  listActiveAssignmentsForAsset: vi.fn(),
  listAssetIdsByPlatformOrNoteSearch: vi.fn(),
  listAssetIdsByStatusFilter: vi.fn(),
  listAssetsPage: vi.fn(),
  listAssetStatusesByIds: vi.fn(),
  listProfilesByUserIds: vi.fn(),
  listSubscriptionsByIds: vi.fn(),
  listUserIdsByIdentitySearch: vi.fn(),
}));

import * as assetRepositories from "@/modules/assets/repositories";
import { getAssetEditorData, getAssetTablePage } from "@/modules/admin/assets/queries";

import type {
  AssetActiveAssignmentRow,
  AssetProfileRow,
  AssetRow,
  AssetStatusRow,
  AssetSubscriptionRow,
} from "@/modules/assets/types";

const mockedGetAssetById = vi.mocked(assetRepositories.getAssetById);
const mockedGetAssetStatusById = vi.mocked(assetRepositories.getAssetStatusById);
const mockedListActiveAssetIdsByUserIds = vi.mocked(assetRepositories.listActiveAssetIdsByUserIds);
const mockedListActiveAssignmentsForAsset = vi.mocked(assetRepositories.listActiveAssignmentsForAsset);
const mockedListAssetIdsByPlatformOrNoteSearch = vi.mocked(assetRepositories.listAssetIdsByPlatformOrNoteSearch);
const mockedListAssetIdsByStatusFilter = vi.mocked(assetRepositories.listAssetIdsByStatusFilter);
const mockedListAssetsPage = vi.mocked(assetRepositories.listAssetsPage);
const mockedListAssetStatusesByIds = vi.mocked(assetRepositories.listAssetStatusesByIds);
const mockedListProfilesByUserIds = vi.mocked(assetRepositories.listProfilesByUserIds);
const mockedListSubscriptionsByIds = vi.mocked(assetRepositories.listSubscriptionsByIds);
const mockedListUserIdsByIdentitySearch = vi.mocked(assetRepositories.listUserIdsByIdentitySearch);

function createAssetRowFixture(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: "asset-1",
    platform: "tradingview",
    assetType: "private",
    account: "asset@example.com",
    note: "Asset note",
    proxy: null,
    assetJson: { session: "token" },
    expiresAt: "2026-07-01T00:00:00.000Z",
    disabledAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function createStatusRowFixture(overrides: Partial<AssetStatusRow> = {}): AssetStatusRow {
  return {
    id: "asset-1",
    platform: "tradingview",
    assetType: "private",
    expiresAt: "2026-07-01T00:00:00.000Z",
    disabledAt: null,
    totalUsed: 0,
    status: "available",
    ...overrides,
  };
}

function createAssignmentFixture(overrides: Partial<AssetActiveAssignmentRow> = {}): AssetActiveAssignmentRow {
  return {
    id: crypto.randomUUID(),
    subscriptionId: "subscription-1",
    userId: "user-1",
    assetId: "asset-1",
    accessKey: "tradingview:private",
    assignedAt: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

function createProfileFixture(overrides: Partial<AssetProfileRow> = {}): AssetProfileRow {
  return {
    userId: "user-1",
    username: "alice",
    email: "alice@example.com",
    avatarUrl: null,
    ...overrides,
  };
}

function createSubscriptionFixture(overrides: Partial<AssetSubscriptionRow> = {}): AssetSubscriptionRow {
  return {
    id: "subscription-1",
    status: "active",
    ...overrides,
  };
}

describe("admin/assets/queries", () => {
  beforeEach(() => {
    mockedGetAssetById.mockResolvedValue(createAssetRowFixture());
    mockedGetAssetStatusById.mockResolvedValue(null);
    mockedListActiveAssetIdsByUserIds.mockResolvedValue([]);
    mockedListActiveAssignmentsForAsset.mockResolvedValue([]);
    mockedListAssetIdsByPlatformOrNoteSearch.mockResolvedValue([]);
    mockedListAssetIdsByStatusFilter.mockResolvedValue([]);
    mockedListAssetsPage.mockResolvedValue({ items: [], totalCount: 0 });
    mockedListAssetStatusesByIds.mockResolvedValue([]);
    mockedListProfilesByUserIds.mockResolvedValue([]);
    mockedListSubscriptionsByIds.mockResolvedValue([]);
    mockedListUserIdsByIdentitySearch.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("converts expiry filter dates to UTC day boundaries before listing assets", async () => {
    await getAssetTablePage({
      search: null,
      assetType: "private",
      status: null,
      expiresFrom: "2026-06-01",
      expiresTo: "2026-06-30",
      page: 2,
      pageSize: 25,
    });

    expect(mockedListAssetsPage).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      assetType: "private",
      expiresFromIso: "2026-06-01T00:00:00.000Z",
      expiresToIso: "2026-06-30T23:59:59.999Z",
      filteredAssetIds: null,
    });
  });

  it("intersects status-filtered assets with merged search matches", async () => {
    mockedListAssetIdsByStatusFilter.mockResolvedValueOnce(["asset-1", "asset-2", "asset-3"]);
    mockedListAssetIdsByPlatformOrNoteSearch.mockResolvedValueOnce(["asset-1", "asset-4"]);
    mockedListUserIdsByIdentitySearch.mockResolvedValueOnce(["user-1"]);
    mockedListActiveAssetIdsByUserIds.mockResolvedValueOnce(["asset-2", "asset-4"]);

    await getAssetTablePage({
      search: "alice",
      assetType: null,
      status: "available",
      expiresFrom: "2026-06-01",
      expiresTo: "2026-06-30",
      page: 1,
      pageSize: 10,
    });

    expect(mockedListAssetIdsByStatusFilter).toHaveBeenCalledWith({
      status: "available",
      assetType: null,
      expiresFromIso: "2026-06-01T00:00:00.000Z",
      expiresToIso: "2026-06-30T23:59:59.999Z",
    });
    expect(mockedListActiveAssetIdsByUserIds).toHaveBeenCalledWith(["user-1"]);
    expect(mockedListAssetsPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      assetType: null,
      expiresFromIso: "2026-06-01T00:00:00.000Z",
      expiresToIso: "2026-06-30T23:59:59.999Z",
      filteredAssetIds: ["asset-1", "asset-2"],
    });
  });

  it("hydrates table rows from the projected status view", async () => {
    mockedListAssetsPage.mockResolvedValueOnce({
      items: [createAssetRowFixture({ assetType: "share" })],
      totalCount: 1,
    });
    mockedListAssetStatusesByIds.mockResolvedValueOnce([
      createStatusRowFixture({ assetType: "share", totalUsed: 2, status: "available" }),
    ]);

    await expect(
      getAssetTablePage({
        search: null,
        assetType: null,
        status: null,
        expiresFrom: null,
        expiresTo: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "asset-1",
          platform: "tradingview",
          assetType: "share",
          note: "Asset note",
          expiresAt: "2026-07-01T00:00:00.000Z",
          disabledAt: null,
          status: "available",
          totalUsed: 2,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
    expect(mockedListAssetStatusesByIds).toHaveBeenCalledWith(["asset-1"]);
  });

  it("falls back to expired status when no status row is available", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));

    mockedListAssetsPage.mockResolvedValueOnce({
      items: [createAssetRowFixture({ expiresAt: "2026-06-01T00:00:00.000Z" })],
      totalCount: 1,
    });

    const result = await getAssetTablePage({
      search: null,
      assetType: null,
      status: null,
      expiresFrom: null,
      expiresTo: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0]).toMatchObject({
      status: "expired",
      totalUsed: 0,
    });
  });

  it("skips status hydration when the table page is empty", async () => {
    mockedListAssetsPage.mockResolvedValueOnce({ items: [], totalCount: 5 });

    await expect(
      getAssetTablePage({
        search: null,
        assetType: null,
        status: null,
        expiresFrom: null,
        expiresTo: null,
        page: 3,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [],
      page: 3,
      pageSize: 10,
      totalCount: 5,
    });

    expect(mockedListAssetStatusesByIds).not.toHaveBeenCalled();
  });

  it("returns null editor data when the asset does not exist", async () => {
    mockedGetAssetById.mockResolvedValueOnce(null);

    await expect(getAssetEditorData("missing-asset")).resolves.toBeNull();
  });

  it("limits private asset detail to one active user and derives assigned status", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));

    mockedGetAssetById.mockResolvedValueOnce(createAssetRowFixture({ assetType: "private" }));
    mockedListActiveAssignmentsForAsset.mockResolvedValueOnce([
      createAssignmentFixture({ userId: "user-1", subscriptionId: "subscription-1" }),
      createAssignmentFixture({ id: "assignment-2", userId: "user-2", subscriptionId: "subscription-2" }),
    ]);
    mockedListProfilesByUserIds.mockResolvedValueOnce([
      createProfileFixture({ userId: "user-1", username: "alice" }),
      createProfileFixture({ userId: "user-2", username: "bob", email: "bob@example.com" }),
    ]);
    mockedListSubscriptionsByIds.mockResolvedValueOnce([
      createSubscriptionFixture({ id: "subscription-1", status: "active" }),
      createSubscriptionFixture({ id: "subscription-2", status: "processed" }),
    ]);

    const result = await getAssetEditorData("asset-1");

    expect(result).toMatchObject({
      status: "assigned",
      totalUsed: 2,
      activeUsers: [
        {
          userId: "user-1",
          username: "alice",
          email: "alice@example.com",
          subscriptionStatus: "active",
        },
      ],
    });
    expect(result?.activeUsers).toHaveLength(1);
  });

  it("keeps all active users for share assets and derives available status even when in use", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));

    mockedGetAssetById.mockResolvedValueOnce(createAssetRowFixture({ assetType: "share" }));
    mockedListActiveAssignmentsForAsset.mockResolvedValueOnce([
      createAssignmentFixture({ userId: "user-1", subscriptionId: "subscription-1", accessKey: "tradingview:share" }),
      createAssignmentFixture({
        id: "assignment-2",
        userId: "user-2",
        subscriptionId: "subscription-2",
        accessKey: "tradingview:share",
      }),
    ]);
    mockedListProfilesByUserIds.mockResolvedValueOnce([
      createProfileFixture({ userId: "user-1", username: "alice" }),
      createProfileFixture({ userId: "user-2", username: "bob", email: "bob@example.com" }),
    ]);
    mockedListSubscriptionsByIds.mockResolvedValueOnce([
      createSubscriptionFixture({ id: "subscription-1", status: "active" }),
      createSubscriptionFixture({ id: "subscription-2", status: "processed" }),
    ]);

    const result = await getAssetEditorData("asset-1");

    expect(result).toMatchObject({
      status: "available",
      totalUsed: 2,
    });
    expect(result?.activeUsers).toHaveLength(2);
    expect(result?.activeUsers[1]).toMatchObject({
      userId: "user-2",
      username: "bob",
      subscriptionStatus: "processed",
    });
  });
});
