import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryRow = Record<string, unknown>;

type QueryDataset = {
  assignmentRows?: QueryRow[];
  extensionTrackRows?: QueryRow[];
  loginLogRows?: QueryRow[];
  profileRows?: QueryRow[];
  transactionRows?: QueryRow[];
};

const { mockedCreateInsForgeAdminDatabase } = vi.hoisted(() => ({
  mockedCreateInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: mockedCreateInsForgeAdminDatabase,
}));

import {
  listAdminAssignmentSnapshotRowsBySubscriptionId,
  listAdminExtensionTrackFilterValues,
  listAdminExtensionTrackPageRows,
  listAdminLoginHistoryOsValues,
  listAdminLoginHistoryPageRows,
  listAdminTransactionPageRows,
  readAdminTransactionRepositoryRowById,
  sumAdminSuccessfulTransactionAmount,
} from "@/modules/admin/userlogs/repositories";

function createQueryBuilder(rows: QueryRow[]) {
  let resultRows = [...rows];
  let lastOrFilter = "";

  const builder = {
    eq(column: string, value: unknown) {
      resultRows = resultRows.filter((row) => row[column] === value);
      return builder;
    },
    gt() {
      return builder;
    },
    gte() {
      return builder;
    },
    ilike() {
      return builder;
    },
    in(column: string, values: unknown[]) {
      resultRows = resultRows.filter((row) => values.includes(row[column]));
      return builder;
    },
    is(column: string, value: unknown) {
      resultRows = resultRows.filter((row) => (value === null ? row[column] == null : row[column] === value));
      return builder;
    },
    limit(count: number) {
      resultRows = resultRows.slice(0, count);
      return builder;
    },
    lt() {
      return builder;
    },
    maybeSingle: vi.fn(async () => ({
      data: resultRows[0] ?? null,
      error: null,
    })),
    not() {
      return builder;
    },
    or(filter: string) {
      lastOrFilter = filter;
      return builder;
    },
    order() {
      return builder;
    },
    range(start: number, end: number) {
      resultRows = resultRows.slice(start, end + 1);
      return builder;
    },
    select: vi.fn((_fields?: string, _options?: object) => builder),
    then(onFulfilled: (value: { count?: number; data: QueryRow[]; error: null }) => unknown) {
      return Promise.resolve(onFulfilled({ count: resultRows.length, data: resultRows, error: null }));
    },
  };

  return {
    builder,
    getLastOrFilter: () => lastOrFilter,
  };
}

function installDatabaseFixture(dataset: QueryDataset) {
  let getLastLoginLogsOrFilter = () => "";
  let getLastExtensionTracksOrFilter = () => "";
  let getLastTransactionsOrFilter = () => "";
  let getLastProfilesOrFilter = () => "";

  const database = {
    from(tableName: string) {
      if (tableName === "login_logs") {
        const queryBuilder = createQueryBuilder(dataset.loginLogRows ?? []);
        getLastLoginLogsOrFilter = queryBuilder.getLastOrFilter;
        return queryBuilder.builder;
      }

      if (tableName === "profiles") {
        const queryBuilder = createQueryBuilder(dataset.profileRows ?? []);
        getLastProfilesOrFilter = queryBuilder.getLastOrFilter;
        return queryBuilder.builder;
      }

      if (tableName === "extension_tracks") {
        const queryBuilder = createQueryBuilder(dataset.extensionTrackRows ?? []);
        getLastExtensionTracksOrFilter = queryBuilder.getLastOrFilter;
        return queryBuilder.builder;
      }

      if (tableName === "transactions") {
        const queryBuilder = createQueryBuilder(dataset.transactionRows ?? []);
        getLastTransactionsOrFilter = queryBuilder.getLastOrFilter;
        return queryBuilder.builder;
      }

      if (tableName === "asset_assignments") {
        return createQueryBuilder(dataset.assignmentRows ?? []).builder;
      }

      throw new Error(`Unhandled table mock: ${tableName}`);
    },
  };

  mockedCreateInsForgeAdminDatabase.mockReturnValue(database);

  return {
    getLastExtensionTracksOrFilter: () => getLastExtensionTracksOrFilter(),
    getLastLoginLogsOrFilter: () => getLastLoginLogsOrFilter(),
    getLastProfilesOrFilter: () => getLastProfilesOrFilter(),
    getLastTransactionsOrFilter: () => getLastTransactionsOrFilter(),
  };
}

describe("admin/userlogs/repositories", () => {
  beforeEach(() => {
    mockedCreateInsForgeAdminDatabase.mockReset();
  });

  it("builds login history search filters from raw email and exact uuid user id matches", async () => {
    const databaseFixture = installDatabaseFixture({
      loginLogRows: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          user_id: "550e8400-e29b-41d4-a716-446655440001",
          email: "alpha@example.com",
          is_success: true,
          failure_reason: null,
          ip_address: "203.0.113.1",
          browser: "Chrome",
          os: "Windows",
          created_at: "2026-06-20T10:00:00.000Z",
        },
      ],
      profileRows: [],
    });

    const result = await listAdminLoginHistoryPageRows({
      search: "550e8400-e29b-41d4-a716-446655440001",
      os: null,
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.totalCount).toBe(1);
    expect(result.rows[0]?.email).toBe("alpha@example.com");
    expect(databaseFixture.getLastLoginLogsOrFilter()).toContain("email.ilike.%550e8400-e29b-41d4-a716-446655440001%");
    expect(databaseFixture.getLastLoginLogsOrFilter()).toContain("user_id.eq.550e8400-e29b-41d4-a716-446655440001");
  });

  it("returns distinct login os values from persisted rows only", async () => {
    installDatabaseFixture({
      loginLogRows: [{ os: "Windows" }, { os: "Windows" }, { os: "Linux" }, { os: null }, { os: "   " }],
    });

    await expect(listAdminLoginHistoryOsValues()).resolves.toEqual(["Linux", "Windows"]);
  });

  it("returns extension rows and distinct browser and os filter values", async () => {
    const databaseFixture = installDatabaseFixture({
      extensionTrackRows: [
        {
          id: "track-1",
          user_id: "user-1",
          extension_id: "ext-a",
          device_id: "device-a",
          extension_version: "1.0.0",
          ip_address: "198.51.100.10",
          city: "Bandung",
          country: "ID",
          browser: "Chrome",
          os: "Windows",
          first_seen_at: "2026-06-01T10:00:00.000Z",
          last_seen_at: "2026-06-02T10:00:00.000Z",
        },
        {
          id: "track-2",
          user_id: "user-2",
          extension_id: "ext-b",
          device_id: "device-b",
          extension_version: "1.0.1",
          ip_address: "198.51.100.20",
          city: null,
          country: null,
          browser: "Firefox",
          os: "Linux",
          first_seen_at: "2026-06-03T10:00:00.000Z",
          last_seen_at: "2026-06-04T10:00:00.000Z",
        },
      ],
      profileRows: [
        {
          user_id: "user-1",
          email: "alpha@example.com",
          username: "alpha",
          avatar_url: null,
          public_id: "MEM-001",
        },
        {
          user_id: "user-2",
          email: "beta@example.com",
          username: "beta",
          avatar_url: null,
          public_id: "MEM-002",
        },
      ],
    });

    const pageResult = await listAdminExtensionTrackPageRows({
      search: "device-a",
      browser: "Chrome",
      os: "Windows",
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    expect(pageResult.totalCount).toBe(1);
    expect(pageResult.rows).toHaveLength(1);
    expect(databaseFixture.getLastExtensionTracksOrFilter()).toContain("extension_id.ilike.%device-a%");

    const filterValues = await listAdminExtensionTrackFilterValues();

    expect(filterValues).toEqual({
      browsers: ["Chrome", "Firefox"],
      osValues: ["Linux", "Windows"],
    });
  });

  it("returns transaction rows, detail rows, and success revenue summary", async () => {
    const databaseFixture = installDatabaseFixture({
      profileRows: [
        {
          user_id: "user-1",
          email: "member@example.com",
          username: "member-alpha",
          avatar_url: null,
          public_id: "MEM-001",
        },
      ],
      transactionRows: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          user_id: "user-1",
          subscription_id: null,
          package_id: "pkg-1",
          package_name: "Starter",
          source: "cdkey",
          status: "success",
          amount_rp: 100000,
          created_at: "2026-06-10T10:00:00.000Z",
          updated_at: "2026-06-10T11:00:00.000Z",
          paid_at: "2026-06-10T11:00:00.000Z",
        },
      ],
    });

    const pageResult = await listAdminTransactionPageRows({
      search: "Starter",
      source: "cdkey",
      status: "success",
      dateFrom: null,
      dateTo: null,
      page: 1,
      pageSize: 10,
    });
    const detailRow = await readAdminTransactionRepositoryRowById("550e8400-e29b-41d4-a716-446655440000");
    const summary = await sumAdminSuccessfulTransactionAmount({
      search: "Starter",
      source: "cdkey",
      status: "success",
      dateFrom: null,
      dateTo: null,
    });

    expect(pageResult.totalCount).toBe(1);
    expect(pageResult.rows[0]).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440000",
      user_id: "user-1",
      public_id: "MEM-001",
      avatar_url: null,
    });
    expect(detailRow).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440000",
      subscription_id: null,
      email: "member@example.com",
    });
    expect(summary).toEqual({
      successAmountRp: 100000,
      successCount: 1,
    });
    expect(databaseFixture.getLastTransactionsOrFilter()).toContain("package_name.ilike.%Starter%");
  });

  it("returns assignment snapshot rows even when the linked asset id is null", async () => {
    installDatabaseFixture({
      assignmentRows: [
        {
          id: "assignment-1",
          subscription_id: "subscription-1",
          asset_id: null,
          original_asset_id: "550e8400-e29b-41d4-a716-446655440009",
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
      ],
    });

    await expect(listAdminAssignmentSnapshotRowsBySubscriptionId("subscription-1")).resolves.toEqual([
      {
        id: "assignment-1",
        subscription_id: "subscription-1",
        asset_id: null,
        original_asset_id: "550e8400-e29b-41d4-a716-446655440009",
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
  });
});
