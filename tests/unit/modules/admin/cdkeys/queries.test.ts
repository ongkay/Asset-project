import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  getIssuablePackageSnapshotsByIds: vi.fn(),
}));

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { getCdKeyDetailSnapshot, getCdKeyTablePage, listIssuablePackages } from "@/modules/admin/cdkeys/queries";
import { getIssuablePackageSnapshotsByIds } from "@/modules/packages/services";

type CdKeySeedRow = {
  id: string;
  code: string;
  package_id: string;
  duration_days: number;
  is_extended: boolean;
  access_keys_json: string[];
  amount_rp: number;
  is_active: boolean;
  used_at: string | null;
  created_at: string;
  updated_at: string;
  package: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  created_by_profile: {
    user_id: string;
    username: string;
    email: string;
    avatar_url: string | null;
  } | null;
  used_by_profile: {
    user_id: string;
    username: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

type PackageSeedRow = {
  id: string;
  name: string;
  is_active: boolean;
};

const mockedCreateInsForgeAdminDatabase = vi.mocked(createInsForgeAdminDatabase);
const mockedGetIssuablePackageSnapshotsByIds = vi.mocked(getIssuablePackageSnapshotsByIds);

function createDatabaseStub(seed: { cdKeys: CdKeySeedRow[]; packages: PackageSeedRow[] }) {
  const calls = {
    paginatedRange: null as { from: number; to: number } | null,
    orExpressions: [] as string[],
  };

  return {
    calls,
    from(tableName: string) {
      if (tableName === "cd_keys") {
        let idFilter: string | null = null;
        let idInFilter: Set<string> | null = null;
        let packageIdFilter: string | null = null;
        let statusFilter: "used" | "unused" | null = null;
        let rangeFilter: { from: number; to: number } | null = null;
        let selectWithCount = false;
        let selectedColumns = "";
        const ilikeFilters: Array<{ column: string; term: string }> = [];
        const requiredAccessKeySets: string[][] = [];
        const excludedAccessKeySets: string[][] = [];

        const runRows = () => {
          const searchedRows = seed.cdKeys.filter((row) => {
            if (packageIdFilter && row.package_id !== packageIdFilter) {
              return false;
            }

            if (idInFilter && !idInFilter.has(row.id)) {
              return false;
            }

            if (statusFilter === "used" && !row.used_at) {
              return false;
            }

            if (statusFilter === "unused" && row.used_at) {
              return false;
            }

            for (const requiredAccessKeySet of requiredAccessKeySets) {
              const hasAllAccessKeys = requiredAccessKeySet.every((accessKey) =>
                row.access_keys_json.includes(accessKey),
              );

              if (!hasAllAccessKeys) {
                return false;
              }
            }

            for (const excludedAccessKeySet of excludedAccessKeySets) {
              const hasAllAccessKeys = excludedAccessKeySet.every((accessKey) =>
                row.access_keys_json.includes(accessKey),
              );

              if (hasAllAccessKeys) {
                return false;
              }
            }

            for (const ilikeFilter of ilikeFilters) {
              const searchableValue =
                ilikeFilter.column === "code"
                  ? row.code
                  : ilikeFilter.column === "package.name"
                    ? (row.package?.name ?? "")
                    : ilikeFilter.column === "used_by_profile.username"
                      ? (row.used_by_profile?.username ?? "")
                      : ilikeFilter.column === "used_by_profile.email"
                        ? (row.used_by_profile?.email ?? "")
                        : "";

              if (!searchableValue.toLowerCase().includes(ilikeFilter.term)) {
                return false;
              }
            }

            return true;
          });

          const sortedRows = [...searchedRows].sort((leftRow, rightRow) => {
            const byCreatedAt = new Date(rightRow.created_at).getTime() - new Date(leftRow.created_at).getTime();

            if (byCreatedAt !== 0) {
              return byCreatedAt;
            }

            return rightRow.id.localeCompare(leftRow.id);
          });

          if (!rangeFilter) {
            return {
              data: sortedRows,
              totalCount: sortedRows.length,
            };
          }

          return {
            data: sortedRows.slice(rangeFilter.from, rangeFilter.to + 1),
            totalCount: sortedRows.length,
          };
        };

        const runPackageOptionRows = () => {
          const byPackageId = new Map<string, CdKeySeedRow>();

          for (const row of seed.cdKeys) {
            if (!byPackageId.has(row.package_id)) {
              byPackageId.set(row.package_id, row);
            }
          }

          return [...byPackageId.values()].map((row) => ({
            package_id: row.package_id,
            package: row.package,
          }));
        };

        const builder = {
          select: (_columns?: string, options?: { count?: "exact" }) => {
            selectedColumns = _columns ?? "";
            selectWithCount = options?.count === "exact";
            return builder;
          },
          order: () => builder,
          eq: (column: string, value: string) => {
            if (column === "id") {
              idFilter = value;
            }

            if (column === "package_id") {
              packageIdFilter = value;
            }

            return builder;
          },
          is: (column: string, value: null) => {
            if (column === "used_at" && value === null) {
              statusFilter = "unused";
            }

            return builder;
          },
          not: (column: string, operator: string, value: null) => {
            if (column === "used_at" && operator === "is" && value === null) {
              statusFilter = "used";
            }

            if (column === "access_keys_json" && operator === "cd" && typeof value === "string") {
              const parsedAccessKeys = JSON.parse(value) as string[];
              excludedAccessKeySets.push(parsedAccessKeys);
            }

            return builder;
          },
          in: (column: string, values: string[]) => {
            if (column === "id") {
              idInFilter = new Set(values);
            }

            return builder;
          },
          ilike: (column: string, pattern: string) => {
            const normalizedTerm = pattern.toLowerCase().replaceAll("%", "").trim();

            if (normalizedTerm.length > 0) {
              ilikeFilters.push({ column, term: normalizedTerm });
            }

            return builder;
          },
          filter: (column: string, operator: string, value: string) => {
            if (column === "access_keys_json" && operator === "cd") {
              const parsedAccessKeys = JSON.parse(value) as string[];
              requiredAccessKeySets.push(parsedAccessKeys);
            }

            return builder;
          },
          or: (expression: string) => {
            calls.orExpressions.push(expression);
            const terms = expression.split(",");

            for (const term of terms) {
              const [rawField, rawValue] = term.split(".ilike.");
              const normalizedValue = rawValue?.toLowerCase().replaceAll("%", "") ?? null;

              if (!normalizedValue) {
                continue;
              }

              if (
                rawField === "code" ||
                rawField === "package.name" ||
                rawField === "used_by_profile.username" ||
                rawField === "used_by_profile.email"
              ) {
                ilikeFilters.push({ column: rawField, term: normalizedValue });
              }
            }

            return builder;
          },
          range: (from: number, to: number) => {
            rangeFilter = { from, to };
            calls.paginatedRange = { from, to };
            return builder;
          },
          maybeSingle: async () => {
            const row = seed.cdKeys.find((candidate) => candidate.id === idFilter) ?? null;
            return { data: row, error: null };
          },
          then: (
            onFulfilled: (value: {
              data: CdKeySeedRow[] | { package_id: string; package: CdKeySeedRow["package"] }[];
              error: null;
              count?: number;
            }) => unknown,
          ) => {
            if (selectWithCount) {
              const rows = runRows();
              return Promise.resolve({ data: rows.data, error: null, count: rows.totalCount }).then(onFulfilled);
            }

            if (selectedColumns.startsWith("package_id, package:packages")) {
              const packageOptionRows = runPackageOptionRows();
              return Promise.resolve({ data: packageOptionRows, error: null }).then(onFulfilled);
            }

            const rows = runRows();
            return Promise.resolve({ data: rows.data, error: null }).then(onFulfilled);
          },
        };

        return builder;
      }

      if (tableName === "packages") {
        let activeOnly = false;

        const builder = {
          select: () => builder,
          order: () => builder,
          eq: (column: string, value: boolean) => {
            if (column === "is_active") {
              activeOnly = value;
            }

            return builder;
          },
          then: (onFulfilled: (value: { data: PackageSeedRow[]; error: null }) => unknown) =>
            Promise.resolve({
              data: activeOnly ? seed.packages.filter((candidate) => candidate.is_active) : seed.packages,
              error: null,
            }).then(onFulfilled),
        };

        return builder;
      }

      throw new Error(`Unexpected table ${tableName}`);
    },
  };
}

describe("admin/cdkeys/queries", () => {
  beforeEach(() => {
    mockedGetIssuablePackageSnapshotsByIds.mockReset();
  });

  it("uses server-side range pagination when summary and search filters are empty", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "2",
        code: "SECOND",
        package_id: "11111111-1111-4111-8111-111111111111",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        package: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Starter",
          is_active: true,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
      {
        id: "1",
        code: "FIRST",
        package_id: "11111111-1111-4111-8111-111111111111",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 90000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        package: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Starter",
          is_active: true,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
    ];

    const databaseStub = createDatabaseStub({ cdKeys: rows, packages: [] });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const result = await getCdKeyTablePage({
      search: null,
      status: null,
      packageId: null,
      packageSummary: null,
      page: 2,
      pageSize: 1,
    });

    expect(databaseStub.calls.paginatedRange).toEqual({ from: 1, to: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("1");
    expect(result.totalCount).toBe(2);
  });

  it("supports case-insensitive search over code, package label, used-by username, and used-by email", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "3",
        code: "GAMMA003",
        package_id: "pkg-3",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
        package: { id: "pkg-3", name: "Gamma Plan", is_active: true },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
      {
        id: "2",
        code: "BETA002",
        package_id: "pkg-2",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["fxreplay:share"],
        amount_rp: 100000,
        is_active: true,
        used_at: "2026-04-05T00:00:00.000Z",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        package: { id: "pkg-2", name: "Beta Plan", is_active: true },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: {
          user_id: "user-2",
          username: "AliceUser",
          email: "alice@example.com",
          avatar_url: null,
        },
      },
      {
        id: "1",
        code: "ALPHA001",
        package_id: "11111111-1111-4111-8111-111111111111",
        duration_days: 30,
        is_extended: false,
        access_keys_json: ["tradingview:private", "fxreplay:share"],
        amount_rp: 90000,
        is_active: false,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        package: null,
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
    ];

    const databaseStub = createDatabaseStub({ cdKeys: rows, packages: [] });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    await expect(
      getCdKeyTablePage({
        search: "alice@EXAMPLE.com",
        status: null,
        packageId: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toMatchObject({
      totalCount: 1,
      items: [
        {
          id: "2",
          code: "BETA002",
          status: "used",
          packageSummary: "share",
        },
      ],
    });

    await expect(
      getCdKeyTablePage({
        search: "gamma",
        status: null,
        packageId: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toMatchObject({
      totalCount: 1,
      items: [{ id: "3" }],
    });

    await expect(
      getCdKeyTablePage({
        search: "ALICEUSER",
        status: null,
        packageId: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toMatchObject({
      totalCount: 1,
      items: [{ id: "2" }],
    });
  });

  it("uses server-side pagination path when search is present", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "3",
        code: "GAMMA003",
        package_id: "pkg-3",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
        package: { id: "pkg-3", name: "Gamma Plan", is_active: true },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
      {
        id: "2",
        code: "BETA002",
        package_id: "pkg-2",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["fxreplay:share"],
        amount_rp: 100000,
        is_active: true,
        used_at: "2026-04-05T00:00:00.000Z",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        package: { id: "pkg-2", name: "Beta Plan", is_active: true },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: {
          user_id: "user-2",
          username: "AliceUser",
          email: "alice@example.com",
          avatar_url: null,
        },
      },
    ];

    const databaseStub = createDatabaseStub({ cdKeys: rows, packages: [] });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const result = await getCdKeyTablePage({
      search: "alice",
      status: null,
      packageId: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });

    expect(databaseStub.calls.paginatedRange).toEqual({ from: 0, to: 9 });
    expect(databaseStub.calls.orExpressions).toHaveLength(0);
    expect(result.totalCount).toBe(1);
    expect(result.items).toEqual([expect.objectContaining({ id: "2" })]);
  });

  it("supports status, package, and package summary filters with stable pagination", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "4",
        code: "ZETA004",
        package_id: "11111111-1111-4111-8111-111111111111",
        duration_days: 30,
        is_extended: false,
        access_keys_json: ["tradingview:private", "fxreplay:share"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-04T00:00:00.000Z",
        updated_at: "2026-04-04T00:00:00.000Z",
        package: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Starter",
          is_active: false,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
      {
        id: "3",
        code: "ZETA003",
        package_id: "11111111-1111-4111-8111-111111111111",
        duration_days: 30,
        is_extended: false,
        access_keys_json: ["tradingview:private", "fxreplay:share"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z",
        package: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Starter",
          is_active: false,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
      {
        id: "2",
        code: "ZETA002",
        package_id: "11111111-1111-4111-8111-111111111111",
        duration_days: 30,
        is_extended: false,
        access_keys_json: ["tradingview:private", "fxreplay:share"],
        amount_rp: 100000,
        is_active: true,
        used_at: "2026-04-06T00:00:00.000Z",
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        package: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Starter",
          is_active: false,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: {
          user_id: "user-2",
          username: "alice",
          email: "alice@example.com",
          avatar_url: null,
        },
      },
    ];

    const databaseStub = createDatabaseStub({ cdKeys: rows, packages: [] });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const result = await getCdKeyTablePage({
      search: null,
      status: "unused",
      packageId: "11111111-1111-4111-8111-111111111111",
      packageSummary: "mixed",
      page: 1,
      pageSize: 1,
    });

    expect(databaseStub.calls.paginatedRange).toEqual({ from: 0, to: 0 });
    expect(result.totalCount).toBe(2);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "4",
        status: "unused",
      }),
    ]);
  });

  it("keeps packageName null when package join is missing and does not fallback to code", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "1",
        code: "FALLBACK01",
        package_id: "pkg-unknown",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        package: null,
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
    ];

    mockedCreateInsForgeAdminDatabase.mockReturnValue(createDatabaseStub({ cdKeys: rows, packages: [] }) as never);

    const result = await getCdKeyTablePage({
      search: null,
      status: null,
      packageId: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0]?.packageName).toBeNull();
    expect(result.items[0]?.packageName).not.toBe("FALLBACK01");
  });

  it("includes package filter options from referenced cd_keys packages including disabled", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "1",
        code: "A",
        package_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 1,
        is_active: true,
        used_at: null,
        created_at: "2026-04-02T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        package: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          name: "Enabled",
          is_active: true,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
      {
        id: "2",
        code: "B",
        package_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["fxreplay:share"],
        amount_rp: 1,
        is_active: true,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        package: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          name: "Disabled",
          is_active: false,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
    ];

    mockedCreateInsForgeAdminDatabase.mockReturnValue(createDatabaseStub({ cdKeys: rows, packages: [] }) as never);

    const result = await getCdKeyTablePage({
      search: null,
      status: null,
      packageId: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });

    expect(result.packageOptions).toEqual([
      {
        packageId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        packageName: "Disabled",
        isActive: false,
      },
      {
        packageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        packageName: "Enabled",
        isActive: true,
      },
    ]);
  });

  it("returns detail snapshot with defensive packageName null handling", async () => {
    const rows: CdKeySeedRow[] = [
      {
        id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        code: "DETAIL001",
        package_id: "pkg-x",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["tradingview:private"],
        amount_rp: 150000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        package: null,
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
    ];

    mockedCreateInsForgeAdminDatabase.mockReturnValue(createDatabaseStub({ cdKeys: rows, packages: [] }) as never);

    const result = await getCdKeyDetailSnapshot({ id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7" });

    expect(result).toMatchObject({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      code: "DETAIL001",
      packageName: null,
      packageSummary: "private",
    });
  });

  it("lists issuable packages from active package IDs via canonical package snapshot batch reads", async () => {
    mockedCreateInsForgeAdminDatabase.mockReturnValue(
      createDatabaseStub({
        cdKeys: [],
        packages: [
          { id: "pkg-a", name: "A", is_active: true },
          { id: "pkg-b", name: "B", is_active: false },
          { id: "pkg-c", name: "C", is_active: true },
        ],
      }) as never,
    );
    mockedGetIssuablePackageSnapshotsByIds.mockResolvedValueOnce([
      {
        id: "pkg-a",
        name: "A",
        amountRp: 1000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
        summary: "private",
      },
      {
        id: "pkg-c",
        name: "C",
        amountRp: 2000,
        durationDays: 60,
        isExtended: false,
        accessKeys: ["fxreplay:share"],
        summary: "share",
      },
    ]);

    await expect(listIssuablePackages()).resolves.toEqual([
      {
        packageId: "pkg-a",
        name: "A",
        amountRp: 1000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
        packageSummary: "private",
      },
      {
        packageId: "pkg-c",
        name: "C",
        amountRp: 2000,
        durationDays: 60,
        isExtended: false,
        accessKeys: ["fxreplay:share"],
        packageSummary: "share",
      },
    ]);
    expect(mockedGetIssuablePackageSnapshotsByIds).toHaveBeenCalledTimes(1);
    expect(mockedGetIssuablePackageSnapshotsByIds).toHaveBeenCalledWith(["pkg-a", "pkg-c"]);
  });
});
