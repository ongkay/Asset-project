import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/users/repositories", () => ({
  listAdminUserActiveAssetsByUserId: vi.fn(),
  listAdminUserTableProfilesBatch: vi.fn(),
  listAdminUserExtensionTracksByUserId: vi.fn(),
  listAdminUserLoginLogsByUserId: vi.fn(),
  listAdminUserSubscriptionsByUserId: vi.fn(),
  listAdminUserSubscriptionsByUserIds: vi.fn(),
  listAdminUserTableProfilesPage: vi.fn(),
  listAdminUserTransactionsByUserId: vi.fn(),
  readAdminUserProfileByUserId: vi.fn(),
}));

import * as adminUserRepositories from "@/modules/admin/users/repositories";
import { getAdminUserDetail, getAdminUsersTablePage } from "@/modules/admin/users/queries";

const mockedListAdminUserActiveAssetsByUserId = vi.mocked(adminUserRepositories.listAdminUserActiveAssetsByUserId);
const mockedListAdminUserTableProfilesBatch = vi.mocked(adminUserRepositories.listAdminUserTableProfilesBatch);
const mockedListAdminUserExtensionTracksByUserId = vi.mocked(
  adminUserRepositories.listAdminUserExtensionTracksByUserId,
);
const mockedListAdminUserLoginLogsByUserId = vi.mocked(adminUserRepositories.listAdminUserLoginLogsByUserId);
const mockedListAdminUserSubscriptionsByUserId = vi.mocked(adminUserRepositories.listAdminUserSubscriptionsByUserId);
const mockedListAdminUserSubscriptionsByUserIds = vi.mocked(adminUserRepositories.listAdminUserSubscriptionsByUserIds);
const mockedListAdminUserTableProfilesPage = vi.mocked(adminUserRepositories.listAdminUserTableProfilesPage);
const mockedListAdminUserTransactionsByUserId = vi.mocked(adminUserRepositories.listAdminUserTransactionsByUserId);
const mockedReadAdminUserProfileByUserId = vi.mocked(adminUserRepositories.readAdminUserProfileByUserId);

describe("admin/users/queries", () => {
  beforeEach(() => {
    mockedListAdminUserActiveAssetsByUserId.mockReset();
    mockedListAdminUserTableProfilesBatch.mockReset();
    mockedListAdminUserExtensionTracksByUserId.mockReset();
    mockedListAdminUserLoginLogsByUserId.mockReset();
    mockedListAdminUserSubscriptionsByUserId.mockReset();
    mockedListAdminUserSubscriptionsByUserIds.mockReset();
    mockedListAdminUserTableProfilesPage.mockReset();
    mockedListAdminUserTransactionsByUserId.mockReset();
    mockedReadAdminUserProfileByUserId.mockReset();
  });

  it("rejects invalid table query input before repository execution", async () => {
    await expect(
      getAdminUsersTablePage({
        search: null,
        role: null,
        subscriptionStatus: null,
        packageSummary: null,
        page: 0,
        pageSize: 10,
      }),
    ).rejects.toThrowError("Too small: expected number to be >=1");

    expect(mockedListAdminUserTableProfilesPage).not.toHaveBeenCalled();
    expect(mockedListAdminUserTableProfilesBatch).not.toHaveBeenCalled();
  });

  it("uses paged profile reads when table filters do not depend on subscriptions", async () => {
    mockedListAdminUserTableProfilesPage.mockResolvedValueOnce({
      profiles: [
        {
          user_id: "user-3",
          email: "charlie@example.com",
          username: "Charlie",
          avatar_url: null,
          public_id: "MEM-CHARLIE",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-04-12T00:00:00.000Z",
        },
        {
          user_id: "user-2",
          email: "bravo@example.com",
          username: "Bravo",
          avatar_url: null,
          public_id: "ADM-BRAVO",
          role: "admin",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-04-11T00:00:00.000Z",
        },
        {
          user_id: "user-1",
          email: "alpha@example.com",
          username: "Alpha",
          avatar_url: null,
          public_id: "MEM-ALPHA",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-04-11T00:00:00.000Z",
        },
      ],
      totalCount: 3,
    });
    mockedListAdminUserSubscriptionsByUserIds.mockResolvedValueOnce([
      {
        id: "sub-running-user-1",
        user_id: "user-1",
        package_id: "pkg-share",
        package_name: "Share Plan",
        access_keys_json: ["tradingview:share"],
        status: "processed",
        start_at: "2026-04-01T00:00:00.000Z",
        end_at: "2099-05-01T00:00:00.000Z",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-05T00:00:00.000Z",
      },
      {
        id: "sub-user-2-canceled",
        user_id: "user-2",
        package_id: "pkg-mixed",
        package_name: "Mixed Plan",
        access_keys_json: ["tradingview:private", "fxreplay:share"],
        status: "canceled",
        start_at: "2026-04-01T00:00:00.000Z",
        end_at: "2026-05-20T00:00:00.000Z",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
      },
      {
        id: "sub-user-2-expired",
        user_id: "user-2",
        package_id: "pkg-share",
        package_name: "Share Plan",
        access_keys_json: ["tradingview:share"],
        status: "expired",
        start_at: "2026-04-01T00:00:00.000Z",
        end_at: "2026-05-20T00:00:00.000Z",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
      },
    ]);

    await expect(
      getAdminUsersTablePage({
        search: null,
        role: null,
        subscriptionStatus: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [
        {
          userId: "user-3",
          email: "charlie@example.com",
          username: "Charlie",
          avatarUrl: null,
          publicId: "MEM-CHARLIE",
          role: "member",
          isBanned: false,
          subscriptionId: null,
          subscriptionStatus: null,
          subscriptionEndAt: null,
          activePackageSummary: "none",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-04-12T00:00:00.000Z",
        },
        {
          userId: "user-2",
          email: "bravo@example.com",
          username: "Bravo",
          avatarUrl: null,
          publicId: "ADM-BRAVO",
          role: "admin",
          isBanned: false,
          subscriptionId: "sub-user-2-canceled",
          subscriptionStatus: "canceled",
          subscriptionEndAt: "2026-05-20T00:00:00.000Z",
          activePackageSummary: "none",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-04-11T00:00:00.000Z",
        },
        {
          userId: "user-1",
          email: "alpha@example.com",
          username: "Alpha",
          avatarUrl: null,
          publicId: "MEM-ALPHA",
          role: "member",
          isBanned: false,
          subscriptionId: "sub-running-user-1",
          subscriptionStatus: "processed",
          subscriptionEndAt: "2099-05-01T00:00:00.000Z",
          activePackageSummary: "share",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-04-11T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 3,
    });

    expect(mockedListAdminUserTableProfilesPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      role: null,
      search: null,
    });
    expect(mockedListAdminUserTableProfilesBatch).not.toHaveBeenCalled();
    expect(mockedListAdminUserSubscriptionsByUserIds).toHaveBeenCalledWith(["user-3", "user-2", "user-1"]);
  });

  it("uses repository-level search pagination before subscription loading when search does not depend on subscription filters", async () => {
    mockedListAdminUserTableProfilesPage.mockResolvedValueOnce({
      profiles: [
        {
          user_id: "USER-ALPHA",
          email: "alpha@example.com",
          username: "Alpha Trader",
          avatar_url: null,
          public_id: "MEM-ALPHA",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      totalCount: 1,
    });
    mockedListAdminUserSubscriptionsByUserIds.mockResolvedValueOnce([
      {
        id: "sub-alpha-running",
        user_id: "USER-ALPHA",
        package_id: "pkg-private",
        package_name: "Private Plan",
        access_keys_json: ["tradingview:private"],
        status: "active",
        start_at: "2026-04-01T00:00:00.000Z",
        end_at: "2099-04-30T00:00:00.000Z",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "sub-beta-running",
        user_id: "user-beta",
        package_id: "pkg-share",
        package_name: "Share Plan",
        access_keys_json: ["tradingview:share"],
        status: "processed",
        start_at: "2026-04-01T00:00:00.000Z",
        end_at: "2099-04-30T00:00:00.000Z",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "sub-gamma-old",
        user_id: "user-gamma",
        package_id: "pkg-private",
        package_name: "Private Plan",
        access_keys_json: ["tradingview:private"],
        status: "canceled",
        start_at: "2026-03-01T00:00:00.000Z",
        end_at: "2026-03-30T00:00:00.000Z",
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-30T00:00:00.000Z",
      },
    ]);

    await expect(
      getAdminUsersTablePage({
        search: "alpha",
        role: "member",
        subscriptionStatus: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [
        {
          userId: "USER-ALPHA",
          email: "alpha@example.com",
          username: "Alpha Trader",
          avatarUrl: null,
          publicId: "MEM-ALPHA",
          role: "member",
          isBanned: false,
          subscriptionId: "sub-alpha-running",
          subscriptionStatus: "active",
          subscriptionEndAt: "2099-04-30T00:00:00.000Z",
          activePackageSummary: "private",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });

    expect(mockedListAdminUserTableProfilesPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      role: "member",
      search: "alpha",
    });
    expect(mockedListAdminUserTableProfilesBatch).not.toHaveBeenCalled();
    expect(mockedListAdminUserSubscriptionsByUserIds).toHaveBeenCalledWith(["USER-ALPHA"]);
  });

  it("scans search-filtered candidates in batches when subscription filters are present", async () => {
    mockedListAdminUserTableProfilesBatch
      .mockResolvedValueOnce([
        {
          user_id: "user-1",
          email: "alpha-1@example.com",
          username: "Alpha One",
          avatar_url: null,
          public_id: "MEM-001",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-04-05T00:00:00.000Z",
        },
        {
          user_id: "user-2",
          email: "alpha-2@example.com",
          username: "Alpha Two",
          avatar_url: null,
          public_id: "MEM-002",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-04-04T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          user_id: "user-3",
          email: "alpha-3@example.com",
          username: "Alpha Three",
          avatar_url: null,
          public_id: "MEM-003",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-01-03T00:00:00.000Z",
          updated_at: "2026-04-03T00:00:00.000Z",
        },
        {
          user_id: "user-4",
          email: "alpha-4@example.com",
          username: "Alpha Four",
          avatar_url: null,
          public_id: "MEM-004",
          role: "member",
          is_banned: false,
          ban_reason: null,
          created_at: "2026-01-04T00:00:00.000Z",
          updated_at: "2026-04-02T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([]);
    mockedListAdminUserSubscriptionsByUserIds
      .mockResolvedValueOnce([
        {
          id: "sub-user-1-running",
          user_id: "user-1",
          package_id: "pkg-private",
          package_name: "Private Plan",
          access_keys_json: ["tradingview:private"],
          status: "active",
          start_at: "2026-04-01T00:00:00.000Z",
          end_at: "2099-04-30T00:00:00.000Z",
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "sub-user-3-running",
          user_id: "user-3",
          package_id: "pkg-private",
          package_name: "Private Plan",
          access_keys_json: ["tradingview:private"],
          status: "active",
          start_at: "2026-04-01T00:00:00.000Z",
          end_at: "2099-04-30T00:00:00.000Z",
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ]);

    await expect(
      getAdminUsersTablePage({
        search: "alpha",
        role: "member",
        subscriptionStatus: "active",
        packageSummary: "private",
        page: 2,
        pageSize: 1,
      }),
    ).resolves.toEqual({
      items: [
        {
          userId: "user-3",
          email: "alpha-3@example.com",
          username: "Alpha Three",
          avatarUrl: null,
          publicId: "MEM-003",
          role: "member",
          isBanned: false,
          subscriptionId: "sub-user-3-running",
          subscriptionStatus: "active",
          subscriptionEndAt: "2099-04-30T00:00:00.000Z",
          activePackageSummary: "private",
          createdAt: "2026-01-03T00:00:00.000Z",
          updatedAt: "2026-04-03T00:00:00.000Z",
        },
      ],
      page: 2,
      pageSize: 1,
      totalCount: 2,
    });

    expect(mockedListAdminUserTableProfilesPage).not.toHaveBeenCalled();
    expect(mockedListAdminUserTableProfilesBatch).toHaveBeenNthCalledWith(1, {
      limit: 2,
      offset: 0,
      role: "member",
      search: "alpha",
    });
    expect(mockedListAdminUserTableProfilesBatch).toHaveBeenNthCalledWith(2, {
      limit: 2,
      offset: 2,
      role: "member",
      search: "alpha",
    });
    expect(mockedListAdminUserSubscriptionsByUserIds).toHaveBeenNthCalledWith(1, ["user-1", "user-2"]);
    expect(mockedListAdminUserSubscriptionsByUserIds).toHaveBeenNthCalledWith(2, ["user-3", "user-4"]);
  });

  it("builds detail payload with current subscription, redacted active assets, and ordered history datasets", async () => {
    mockedReadAdminUserProfileByUserId.mockResolvedValueOnce({
      user_id: "user-1",
      email: "alpha@example.com",
      username: "Alpha",
      avatar_url: "https://cdn.example.com/avatar.png",
      public_id: "MEM-ALPHA",
      role: "member",
      is_banned: false,
      ban_reason: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-04-11T00:00:00.000Z",
    });
    mockedListAdminUserSubscriptionsByUserId.mockResolvedValueOnce([
      {
        id: "sub-running-user-1",
        user_id: "user-1",
        package_id: "pkg-mixed",
        package_name: "Mixed Plan",
        access_keys_json: ["tradingview:private", "fxreplay:share"],
        status: "processed",
        start_at: "2026-04-01T00:00:00.000Z",
        end_at: "2099-05-01T00:00:00.000Z",
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-05T00:00:00.000Z",
      },
    ]);
    mockedListAdminUserActiveAssetsByUserId.mockResolvedValueOnce([
      {
        asset_id: "asset-2",
        subscription_id: "sub-running-user-1",
        access_key: "fxreplay:share",
        platform: "fxreplay",
        asset_type: "share",
        note: "Team seat",
        expires_at: "2026-06-01T00:00:00.000Z",
        subscription_status: "processed",
        subscription_end_at: "2099-05-01T00:00:00.000Z",
      },
      {
        asset_id: "asset-1",
        subscription_id: "sub-running-user-1",
        access_key: "tradingview:private",
        platform: "tradingview",
        asset_type: "private",
        note: null,
        expires_at: "2026-05-01T00:00:00.000Z",
        subscription_status: "active",
        subscription_end_at: "2099-05-01T00:00:00.000Z",
      },
    ]);
    mockedListAdminUserTransactionsByUserId.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        transaction_id: `trx-${index + 1}`,
        user_id: "user-1",
        package_id: "pkg-mixed",
        package_name: "Mixed Plan",
        source: index % 3 === 0 ? "payment_dummy" : index % 3 === 1 ? "cdkey" : "admin_manual",
        status: "success",
        amount_rp: 100000 + index,
        created_at: `2026-04-${String(20 - index).padStart(2, "0")}T00:00:00.000Z`,
        updated_at: `2026-04-${String(20 - index).padStart(2, "0")}T01:00:00.000Z`,
        paid_at: `2026-04-${String(20 - index).padStart(2, "0")}T02:00:00.000Z`,
      })),
    );
    mockedListAdminUserLoginLogsByUserId.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        id: `log-${index + 1}`,
        user_id: "user-1",
        email: "alpha@example.com",
        is_success: index % 2 === 0,
        failure_reason: index % 2 === 0 ? null : "wrong_password",
        ip_address: `10.0.0.${index + 1}`,
        browser: "Chrome",
        os: "Linux",
        created_at: `2026-04-${String(20 - index).padStart(2, "0")}T03:00:00.000Z`,
      })),
    );
    mockedListAdminUserExtensionTracksByUserId.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        id: `track-${index + 1}`,
        user_id: "user-1",
        extension_id: `ext-${index + 1}`,
        device_id: `device-${index + 1}`,
        extension_version: `1.0.${index + 1}`,
        ip_address: `172.16.0.${index + 1}`,
        city: "Jakarta",
        country: "ID",
        browser: "Chrome",
        os: "Linux",
        first_seen_at: `2026-04-${String(10 + index).padStart(2, "0")}T00:00:00.000Z`,
        last_seen_at: `2026-04-${String(20 - index).padStart(2, "0")}T04:00:00.000Z`,
      })),
    );

    const detail = await getAdminUserDetail({ userId: "user-1" });

    expect(detail.currentSubscription).toEqual({
      subscriptionId: "sub-running-user-1",
      packageId: "pkg-mixed",
      packageName: "Mixed Plan",
      status: "processed",
      startAt: "2026-04-01T00:00:00.000Z",
      endAt: "2099-05-01T00:00:00.000Z",
      packageSummary: "mixed",
    });
    expect(detail.activeAssets).toEqual([
      {
        assetId: "asset-1",
        subscriptionId: "sub-running-user-1",
        accessKey: "tradingview:private",
        platform: "tradingview",
        assetType: "private",
        note: null,
        expiresAt: "2026-05-01T00:00:00.000Z",
        subscriptionStatus: "active",
        subscriptionEndAt: "2099-05-01T00:00:00.000Z",
      },
      {
        assetId: "asset-2",
        subscriptionId: "sub-running-user-1",
        accessKey: "fxreplay:share",
        platform: "fxreplay",
        assetType: "share",
        note: "Team seat",
        expiresAt: "2026-06-01T00:00:00.000Z",
        subscriptionStatus: "processed",
        subscriptionEndAt: "2099-05-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns nullable current subscription fields when the user has no running subscription", async () => {
    mockedReadAdminUserProfileByUserId.mockResolvedValueOnce({
      user_id: "user-2",
      email: "bravo@example.com",
      username: "Bravo",
      avatar_url: null,
      public_id: "MEM-BRAVO",
      role: "member",
      is_banned: false,
      ban_reason: null,
      created_at: "2026-02-01T00:00:00.000Z",
      updated_at: "2026-02-02T00:00:00.000Z",
    });
    mockedListAdminUserSubscriptionsByUserId.mockResolvedValueOnce([
      {
        id: "sub-old-user-2",
        user_id: "user-2",
        package_id: "pkg-private",
        package_name: "Private Plan",
        access_keys_json: ["tradingview:private"],
        status: "expired",
        start_at: "2026-01-01T00:00:00.000Z",
        end_at: "2026-01-31T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-31T00:00:00.000Z",
      },
    ]);
    mockedListAdminUserActiveAssetsByUserId.mockResolvedValueOnce([]);
    mockedListAdminUserTransactionsByUserId.mockResolvedValueOnce([]);
    mockedListAdminUserLoginLogsByUserId.mockResolvedValueOnce([]);
    mockedListAdminUserExtensionTracksByUserId.mockResolvedValueOnce([]);

    await expect(getAdminUserDetail({ userId: "user-2" })).resolves.toMatchObject({
      currentSubscription: {
        subscriptionId: null,
        packageId: null,
        packageName: null,
        status: null,
        startAt: null,
        endAt: null,
        packageSummary: "none",
      },
    });
  });
});
