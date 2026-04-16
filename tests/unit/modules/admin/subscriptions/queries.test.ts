import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/subscriptions/repositories", () => ({
  getSubscriptionById: vi.fn(),
  getPackageById: vi.fn(),
  listCandidateAssetsByAccessKey: vi.fn(),
  listCurrentAssignmentsBySubscriptionId: vi.fn(),
  listPackagesForAdminSelection: vi.fn(),
  listSubscriberSubscriptionsForTable: vi.fn(),
  listSuccessfulTransactionTotalsByUserIds: vi.fn(),
  searchMemberProfiles: vi.fn(),
}));

import * as subscriptionRepositories from "@/modules/subscriptions/repositories";
import {
  getSubscriberActivationDraft,
  getSubscriberEditorData,
  getSubscriberTablePage,
  searchSubscriberUsers,
} from "@/modules/admin/subscriptions/queries";

const mockedGetPackageById = vi.mocked(subscriptionRepositories.getPackageById);
const mockedGetSubscriptionById = vi.mocked(subscriptionRepositories.getSubscriptionById);
const mockedListCandidateAssetsByAccessKey = vi.mocked(subscriptionRepositories.listCandidateAssetsByAccessKey);
const mockedListCurrentAssignmentsBySubscriptionId = vi.mocked(
  subscriptionRepositories.listCurrentAssignmentsBySubscriptionId,
);
const mockedListPackagesForAdminSelection = vi.mocked(subscriptionRepositories.listPackagesForAdminSelection);
const mockedListSubscriberSubscriptionsForTable = vi.mocked(
  subscriptionRepositories.listSubscriberSubscriptionsForTable,
);
const mockedListSuccessfulTransactionTotalsByUserIds = vi.mocked(
  subscriptionRepositories.listSuccessfulTransactionTotalsByUserIds,
);
const mockedSearchMemberProfiles = vi.mocked(subscriptionRepositories.searchMemberProfiles);

function createSubscriptionTableRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    subscriptionId: "subscription-1",
    userId: "user-1",
    username: "alice",
    email: "alice@example.com",
    avatarUrl: null,
    packageId: "package-1",
    packageName: "Premium Package",
    accessKeys: ["tradingview:private"],
    status: "active",
    startAt: "2026-04-01T00:00:00.000Z",
    endAt: "2026-04-30T00:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    isRunning: true,
    ...overrides,
  };
}

describe("admin/subscriptions/queries", () => {
  beforeEach(() => {
    mockedGetPackageById.mockResolvedValue({
      packageId: "package-1",
      name: "Premium Package",
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
      isActive: true,
    });
    mockedListCandidateAssetsByAccessKey.mockResolvedValue([]);
    mockedListCurrentAssignmentsBySubscriptionId.mockResolvedValue([]);
    mockedListPackagesForAdminSelection.mockResolvedValue([]);
    mockedListSubscriberSubscriptionsForTable.mockResolvedValue([]);
    mockedListSuccessfulTransactionTotalsByUserIds.mockResolvedValue({});
    mockedSearchMemberProfiles.mockResolvedValue({ users: [], totalCount: 0 });
    mockedGetSubscriptionById.mockResolvedValue(null);
  });

  it("selects one row per user with running subscriptions first and aggregates total spent", async () => {
    mockedListSubscriberSubscriptionsForTable.mockResolvedValueOnce([
      createSubscriptionTableRowFixture({
        subscriptionId: "subscription-running",
        userId: "user-1",
        username: "alice",
        status: "processed",
        updatedAt: "2026-04-15T00:00:00.000Z",
        isRunning: true,
      }),
      createSubscriptionTableRowFixture({
        subscriptionId: "subscription-historical-newer",
        userId: "user-1",
        username: "alice",
        status: "canceled",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        isRunning: false,
      }),
      createSubscriptionTableRowFixture({
        subscriptionId: "subscription-user-2-old",
        userId: "user-2",
        username: "bob",
        email: "bob@example.com",
        packageName: "Starter Package",
        status: "expired",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-10T00:00:00.000Z",
        isRunning: false,
      }),
      createSubscriptionTableRowFixture({
        subscriptionId: "subscription-user-2-latest",
        userId: "user-2",
        username: "bob",
        email: "bob@example.com",
        packageName: "Starter Package",
        status: "canceled",
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-21T00:00:00.000Z",
        isRunning: false,
      }),
    ]);
    mockedListSuccessfulTransactionTotalsByUserIds.mockResolvedValueOnce({
      "user-1": 300000,
      "user-2": 150000,
    });

    await expect(
      getSubscriberTablePage({
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
          userId: "user-1",
          username: "alice",
          email: "alice@example.com",
          avatarUrl: null,
          subscriptionId: "subscription-running",
          subscriptionStatus: "processed",
          startAt: "2026-04-01T00:00:00.000Z",
          expiresAt: "2026-04-30T00:00:00.000Z",
          packageId: "package-1",
          packageName: "Premium Package",
          accessKeys: ["tradingview:private"],
          totalSpentRp: 300000,
          selectedSubscriptionUpdatedAt: "2026-04-15T00:00:00.000Z",
        },
        {
          userId: "user-2",
          username: "bob",
          email: "bob@example.com",
          avatarUrl: null,
          subscriptionId: "subscription-user-2-latest",
          subscriptionStatus: "canceled",
          startAt: "2026-04-01T00:00:00.000Z",
          expiresAt: "2026-04-30T00:00:00.000Z",
          packageId: "package-1",
          packageName: "Starter Package",
          accessKeys: ["tradingview:private"],
          totalSpentRp: 150000,
          selectedSubscriptionUpdatedAt: "2026-03-21T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 2,
    });
  });

  it("builds activation draft candidate groups by exact access key", async () => {
    mockedGetPackageById.mockResolvedValueOnce({
      packageId: "package-1",
      name: "Premium Package",
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private", "fxreplay:share"],
      isActive: true,
    });
    mockedListCurrentAssignmentsBySubscriptionId.mockResolvedValueOnce([
      {
        assignmentId: "assignment-1",
        accessKey: "tradingview:private",
        assetId: "asset-current",
        platform: "tradingview",
        assetType: "private",
        note: "existing asset",
        expiresAt: "2026-05-01T00:00:00.000Z",
      },
    ]);
    mockedListCandidateAssetsByAccessKey.mockImplementation(async ({ accessKey }) => {
      if (accessKey === "tradingview:private") {
        return [
          {
            assetId: "asset-current",
            platform: "tradingview",
            assetType: "private",
            note: "existing asset",
            expiresAt: "2026-05-01T00:00:00.000Z",
            status: "assigned",
            totalUsed: 1,
          },
        ];
      }

      return [
        {
          assetId: "asset-share-1",
          platform: "fxreplay",
          assetType: "share",
          note: "share pool",
          expiresAt: "2026-05-03T00:00:00.000Z",
          status: "available",
          totalUsed: 3,
        },
      ];
    });

    const result = await getSubscriberActivationDraft({
      userId: "user-1",
      packageId: "package-1",
      subscriptionId: "subscription-1",
    });

    expect(result).toEqual({
      userId: "user-1",
      packageId: "package-1",
      subscriptionId: "subscription-1",
      packageSnapshot: {
        packageId: "package-1",
        name: "Premium Package",
        amountRp: 150000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private", "fxreplay:share"],
      },
      defaultDurationDays: 30,
      candidateGroups: [
        {
          accessKey: "tradingview:private",
          platform: "tradingview",
          assetType: "private",
          currentSelection: {
            accessKey: "tradingview:private",
            assetId: "asset-current",
            platform: "tradingview",
            assetType: "private",
            note: "existing asset",
            expiresAt: "2026-05-01T00:00:00.000Z",
            assignmentId: "assignment-1",
          },
          candidates: [
            {
              assetId: "asset-current",
              platform: "tradingview",
              assetType: "private",
              note: "existing asset",
              expiresAt: "2026-05-01T00:00:00.000Z",
              status: "assigned",
              totalUsed: 1,
              isCurrentSelection: true,
            },
          ],
          isFulfilled: true,
          canQuickAddPrivateAsset: true,
        },
        {
          accessKey: "fxreplay:share",
          platform: "fxreplay",
          assetType: "share",
          currentSelection: null,
          candidates: [
            {
              assetId: "asset-share-1",
              platform: "fxreplay",
              assetType: "share",
              note: "share pool",
              expiresAt: "2026-05-03T00:00:00.000Z",
              status: "available",
              totalUsed: 3,
              isCurrentSelection: false,
            },
          ],
          isFulfilled: false,
          canQuickAddPrivateAsset: false,
        },
      ],
    });
  });

  it("filters the selected subscriber rows by search, asset type, status, and expiry range", async () => {
    mockedListSubscriberSubscriptionsForTable.mockResolvedValueOnce([
      createSubscriptionTableRowFixture({
        subscriptionId: "subscription-1",
        userId: "user-1",
        username: "alice",
        email: "alice@example.com",
        status: "processed",
        endAt: "2026-04-25T00:00:00.000Z",
        accessKeys: ["tradingview:private"],
        isRunning: true,
      }),
      createSubscriptionTableRowFixture({
        subscriptionId: "subscription-2",
        userId: "user-2",
        username: "bob",
        email: "bob@example.com",
        status: "active",
        endAt: "2026-05-25T00:00:00.000Z",
        accessKeys: ["fxreplay:share"],
        isRunning: true,
      }),
    ]);
    mockedListSuccessfulTransactionTotalsByUserIds.mockResolvedValueOnce({
      "user-1": 150000,
      "user-2": 50000,
    });

    const result = await getSubscriberTablePage({
      search: "alice@example.com",
      assetType: "private",
      status: "processed",
      expiresFrom: "2026-04-20",
      expiresTo: "2026-04-30",
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          userId: "user-1",
          subscriptionId: "subscription-1",
          subscriptionStatus: "processed",
          totalSpentRp: 150000,
        }),
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });
  });

  it("builds editor bootstrap from server-backed selected user, subscription, packages, and assignments", async () => {
    mockedListPackagesForAdminSelection.mockResolvedValueOnce([
      {
        packageId: "package-1",
        name: "Premium Package",
        amountRp: 150000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
        isActive: true,
        packageSummary: "private",
      },
    ]);
    mockedSearchMemberProfiles.mockResolvedValueOnce({
      users: [
        {
          userId: "user-1",
          username: "alice",
          email: "alice@example.com",
          avatarUrl: null,
          currentSubscriptionId: "subscription-1",
          currentSubscriptionStatus: "active",
        },
      ],
      totalCount: 1,
    });
    mockedGetSubscriptionById.mockResolvedValueOnce({
      id: "subscription-1",
      userId: "user-1",
      packageId: "package-1",
      packageName: "Premium Package",
      accessKeys: ["tradingview:private"],
      status: "active",
      source: "admin_manual",
      startAt: "2026-04-01T00:00:00.000Z",
      endAt: "2026-04-30T00:00:00.000Z",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
    });
    mockedListCurrentAssignmentsBySubscriptionId.mockResolvedValueOnce([
      {
        assignmentId: "assignment-1",
        accessKey: "tradingview:private",
        assetId: "asset-current",
        platform: "tradingview",
        assetType: "private",
        note: "existing asset",
        expiresAt: "2026-05-01T00:00:00.000Z",
      },
    ]);
    mockedListSuccessfulTransactionTotalsByUserIds.mockResolvedValueOnce({
      "user-1": 300000,
    });

    const result = await getSubscriberEditorData({
      userId: "user-1",
      subscriptionId: "subscription-1",
    });

    expect(result).toEqual({
      selectedUser: {
        userId: "user-1",
        username: "alice",
        email: "alice@example.com",
        avatarUrl: null,
        currentSubscriptionId: "subscription-1",
        currentSubscriptionStatus: "active",
      },
      selectedSubscription: {
        userId: "user-1",
        username: "alice",
        email: "alice@example.com",
        avatarUrl: null,
        subscriptionId: "subscription-1",
        subscriptionStatus: "active",
        startAt: "2026-04-01T00:00:00.000Z",
        expiresAt: "2026-04-30T00:00:00.000Z",
        packageId: "package-1",
        packageName: "Premium Package",
        accessKeys: ["tradingview:private"],
        totalSpentRp: 300000,
        selectedSubscriptionUpdatedAt: "2026-04-10T00:00:00.000Z",
      },
      packageOptions: [
        {
          packageId: "package-1",
          name: "Premium Package",
          amountRp: 150000,
          durationDays: 30,
          isExtended: true,
          accessKeys: ["tradingview:private"],
          isActive: true,
          packageSummary: "private",
        },
      ],
      defaultPackageId: "package-1",
      defaultDurationDays: 30,
      currentAssignments: [
        {
          assignmentId: "assignment-1",
          accessKey: "tradingview:private",
          assetId: "asset-current",
          platform: "tradingview",
          assetType: "private",
          note: "existing asset",
          expiresAt: "2026-05-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("searches member users only through the canonical picker query", async () => {
    mockedSearchMemberProfiles.mockResolvedValueOnce({
      users: [
        {
          userId: "user-1",
          username: "alice",
          email: "alice@example.com",
          avatarUrl: null,
          currentSubscriptionId: "subscription-1",
          currentSubscriptionStatus: "active",
        },
      ],
      totalCount: 1,
    });

    await expect(searchSubscriberUsers({ query: "Alice", page: 1, pageSize: 10 })).resolves.toEqual({
      users: [
        {
          userId: "user-1",
          username: "alice",
          email: "alice@example.com",
          avatarUrl: null,
          currentSubscriptionId: "subscription-1",
          currentSubscriptionStatus: "active",
        },
      ],
      totalCount: 1,
    });
  });
});
