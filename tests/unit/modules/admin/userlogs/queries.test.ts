import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/userlogs/repositories", () => ({
  listAdminAssignmentSnapshotRowsBySubscriptionId: vi.fn(),
  listAdminExtensionTrackFilterValues: vi.fn(),
  listAdminExtensionTrackPageRows: vi.fn(),
  listAdminLoginHistoryOsValues: vi.fn(),
  listAdminLoginHistoryPageRows: vi.fn(),
  listAdminTransactionPageRows: vi.fn(),
  readAdminTransactionRepositoryRowById: vi.fn(),
  sumAdminSuccessfulTransactionAmount: vi.fn(),
}));

import * as userLogsRepositories from "@/modules/admin/userlogs/repositories";
import {
  getAdminExtensionTrackPage,
  getAdminLoginHistoryPage,
  getAdminTransactionDetail,
  getAdminTransactionsPage,
} from "@/modules/admin/userlogs/queries";

const mockedListAdminLoginHistoryPageRows = vi.mocked(userLogsRepositories.listAdminLoginHistoryPageRows);
const mockedListAdminLoginHistoryOsValues = vi.mocked(userLogsRepositories.listAdminLoginHistoryOsValues);
const mockedListAdminExtensionTrackPageRows = vi.mocked(userLogsRepositories.listAdminExtensionTrackPageRows);
const mockedListAdminExtensionTrackFilterValues = vi.mocked(userLogsRepositories.listAdminExtensionTrackFilterValues);
const mockedListAdminTransactionPageRows = vi.mocked(userLogsRepositories.listAdminTransactionPageRows);
const mockedSumAdminSuccessfulTransactionAmount = vi.mocked(userLogsRepositories.sumAdminSuccessfulTransactionAmount);
const mockedReadAdminTransactionRepositoryRowById = vi.mocked(
  userLogsRepositories.readAdminTransactionRepositoryRowById,
);
const mockedListAdminAssignmentSnapshotRowsBySubscriptionId = vi.mocked(
  userLogsRepositories.listAdminAssignmentSnapshotRowsBySubscriptionId,
);

describe("admin/userlogs/queries", () => {
  beforeEach(() => {
    mockedListAdminLoginHistoryPageRows.mockReset();
    mockedListAdminLoginHistoryOsValues.mockReset();
    mockedListAdminExtensionTrackPageRows.mockReset();
    mockedListAdminExtensionTrackFilterValues.mockReset();
    mockedListAdminTransactionPageRows.mockReset();
    mockedSumAdminSuccessfulTransactionAmount.mockReset();
    mockedReadAdminTransactionRepositoryRowById.mockReset();
    mockedListAdminAssignmentSnapshotRowsBySubscriptionId.mockReset();
  });

  it("maps login history rows with resolved and unresolved identities", async () => {
    mockedListAdminLoginHistoryPageRows.mockResolvedValueOnce({
      rows: [
        {
          id: "log-1",
          user_id: "user-1",
          email: "raw@example.com",
          is_success: true,
          failure_reason: null,
          ip_address: "203.0.113.10",
          browser: "Chrome",
          os: "Windows",
          created_at: "2026-06-01T10:00:00.000Z",
          username: "alpha",
          profile_email: "alpha@example.com",
          avatar_url: null,
          public_id: "MEM-001",
        },
        {
          id: "log-2",
          user_id: null,
          email: "orphan@example.com",
          is_success: false,
          failure_reason: "email_not_found",
          ip_address: "203.0.113.11",
          browser: null,
          os: null,
          created_at: "2026-06-01T11:00:00.000Z",
          username: null,
          profile_email: null,
          avatar_url: null,
          public_id: null,
        },
      ],
      totalCount: 2,
    });
    mockedListAdminLoginHistoryOsValues.mockResolvedValueOnce(["Linux", "Windows"]);

    await expect(
      getAdminLoginHistoryPage({
        search: null,
        os: null,
        dateFrom: null,
        dateTo: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [
        {
          loginLogId: "log-1",
          user: {
            userId: "user-1",
            username: "alpha",
            email: "alpha@example.com",
            avatarUrl: null,
            publicId: "MEM-001",
            isResolved: true,
          },
          ipAddress: "203.0.113.10",
          browser: "Chrome",
          os: "Windows",
          loginTime: "2026-06-01T10:00:00.000Z",
          isSuccess: true,
          failureReason: null,
        },
        {
          loginLogId: "log-2",
          user: {
            userId: null,
            username: null,
            email: "orphan@example.com",
            avatarUrl: null,
            publicId: null,
            isResolved: false,
          },
          ipAddress: "203.0.113.11",
          browser: null,
          os: null,
          loginTime: "2026-06-01T11:00:00.000Z",
          isSuccess: false,
          failureReason: "email_not_found",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 2,
      availableOsValues: ["Linux", "Windows"],
    });
  });

  it("maps extension track rows and filter option lists", async () => {
    mockedListAdminExtensionTrackPageRows.mockResolvedValueOnce({
      rows: [
        {
          id: "track-1",
          user_id: "user-1",
          username: "alpha",
          email: "alpha@example.com",
          avatar_url: null,
          public_id: "MEM-001",
          extension_id: "ext-a",
          device_id: "device-a",
          extension_version: "1.0.0",
          ip_address: "198.51.100.10",
          city: null,
          country: null,
          browser: "Chrome",
          os: "Windows",
          first_seen_at: "2026-06-01T10:00:00.000Z",
          last_seen_at: "2026-06-02T10:00:00.000Z",
        },
      ],
      totalCount: 1,
    });
    mockedListAdminExtensionTrackFilterValues.mockResolvedValueOnce({
      browsers: ["Chrome"],
      osValues: ["Windows"],
    });

    const result = await getAdminExtensionTrackPage({
      search: null,
      browser: null,
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      items: [
        {
          extensionTrackId: "track-1",
          user: {
            userId: "user-1",
            username: "alpha",
            email: "alpha@example.com",
            avatarUrl: null,
            publicId: "MEM-001",
          },
          ipAddress: "198.51.100.10",
          city: null,
          country: null,
          browser: "Chrome",
          os: "Windows",
          extensionVersion: "1.0.0",
          deviceId: "device-a",
          extensionId: "ext-a",
          firstSeenAt: "2026-06-01T10:00:00.000Z",
          lastSeenAt: "2026-06-02T10:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      availableBrowsers: ["Chrome"],
      availableOsValues: ["Windows"],
    });
  });

  it("maps transactions rows and revenue summary", async () => {
    mockedListAdminTransactionPageRows.mockResolvedValueOnce({
      rows: [
        {
          id: "tx-1",
          user_id: "user-1",
          username: "alpha",
          email: "alpha@example.com",
          avatar_url: null,
          public_id: "MEM-001",
          subscription_id: "sub-1",
          package_id: "pkg-1",
          package_name: "Starter",
          source: "cdkey",
          status: "success",
          amount_rp: 100000,
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-01T11:00:00.000Z",
          paid_at: "2026-06-01T11:00:00.000Z",
        },
      ],
      totalCount: 1,
    });
    mockedSumAdminSuccessfulTransactionAmount.mockResolvedValueOnce({
      successAmountRp: 100000,
      successCount: 1,
    });

    const result = await getAdminTransactionsPage({
      search: null,
      source: null,
      status: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      items: [
        {
          transactionId: "tx-1",
          subscriptionId: "sub-1",
          user: {
            userId: "user-1",
            username: "alpha",
            email: "alpha@example.com",
            avatarUrl: null,
            publicId: "MEM-001",
          },
          packageId: "pkg-1",
          packageName: "Starter",
          source: "cdkey",
          status: "success",
          amountRp: 100000,
          createdAt: "2026-06-01T10:00:00.000Z",
          updatedAt: "2026-06-01T11:00:00.000Z",
          paidAt: "2026-06-01T11:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      revenueSummary: {
        successAmountRp: 100000,
        successCount: 1,
      },
    });
  });

  it("returns a deterministic empty assignment history when the transaction has no subscription", async () => {
    mockedReadAdminTransactionRepositoryRowById.mockResolvedValueOnce({
      id: "tx-1",
      user_id: "user-1",
      username: "alpha",
      email: "alpha@example.com",
      avatar_url: null,
      public_id: "MEM-001",
      subscription_id: null,
      package_id: "pkg-1",
      package_name: "Starter",
      source: "cdkey",
      status: "success",
      amount_rp: 100000,
      created_at: "2026-06-01T10:00:00.000Z",
      updated_at: "2026-06-01T11:00:00.000Z",
      paid_at: "2026-06-01T11:00:00.000Z",
    });

    const result = await getAdminTransactionDetail({ transactionId: "550e8400-e29b-41d4-a716-446655440000" });

    expect(result.assignmentHistory).toEqual([]);
    expect(mockedListAdminAssignmentSnapshotRowsBySubscriptionId).not.toHaveBeenCalled();
  });

  it("hydrates assignment snapshot history when a linked subscription exists", async () => {
    mockedReadAdminTransactionRepositoryRowById.mockResolvedValueOnce({
      id: "tx-2",
      user_id: "user-1",
      username: "alpha",
      email: "alpha@example.com",
      avatar_url: null,
      public_id: "MEM-001",
      subscription_id: "sub-1",
      package_id: "pkg-1",
      package_name: "Starter",
      source: "payment_dummy",
      status: "success",
      amount_rp: 120000,
      created_at: "2026-06-02T10:00:00.000Z",
      updated_at: "2026-06-02T11:00:00.000Z",
      paid_at: "2026-06-02T11:00:00.000Z",
    });
    mockedListAdminAssignmentSnapshotRowsBySubscriptionId.mockResolvedValueOnce([
      {
        id: "assignment-1",
        subscription_id: "sub-1",
        asset_id: null,
        original_asset_id: "asset-original-1",
        access_key: "tradingview:private",
        asset_platform: "tradingview",
        asset_type: "private",
        asset_note: "Historical snapshot",
        asset_expires_at: "2026-12-31T00:00:00.000Z",
        assigned_at: "2026-06-01T00:00:00.000Z",
        revoked_at: null,
        revoke_reason: null,
        asset_deleted_at: "2026-07-01T00:00:00.000Z",
      },
    ]);

    await expect(getAdminTransactionDetail({ transactionId: "550e8400-e29b-41d4-a716-446655440001" })).resolves.toEqual(
      {
        transactionId: "tx-2",
        subscriptionId: "sub-1",
        user: {
          userId: "user-1",
          username: "alpha",
          email: "alpha@example.com",
          avatarUrl: null,
          publicId: "MEM-001",
        },
        packageName: "Starter",
        source: "payment_dummy",
        status: "success",
        amountRp: 120000,
        createdAt: "2026-06-02T10:00:00.000Z",
        updatedAt: "2026-06-02T11:00:00.000Z",
        paidAt: "2026-06-02T11:00:00.000Z",
        assignmentHistory: [
          {
            assignmentId: "assignment-1",
            subscriptionId: "sub-1",
            assetId: null,
            originalAssetId: "asset-original-1",
            accessKey: "tradingview:private",
            platform: "tradingview",
            assetType: "private",
            assetNote: "Historical snapshot",
            assetExpiresAt: "2026-12-31T00:00:00.000Z",
            assignedAt: "2026-06-01T00:00:00.000Z",
            revokedAt: null,
            revokeReason: null,
            assetDeletedAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      },
    );
  });
});
