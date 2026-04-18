import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  getIssuablePackageSnapshotsByIds: vi.fn(),
}));

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { getCdKeyDetailSnapshot, getCdKeyTablePage } from "@/modules/admin/cdkeys/queries";

type CdKeyRow = {
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

const mockedCreateInsForgeAdminDatabase = vi.mocked(createInsForgeAdminDatabase);

function createAdminCdKeyDatabaseStub(seedRows: CdKeyRow[]) {
  const calls = {
    orExpressions: [] as string[],
    ilikeCalls: [] as Array<{ column: string; pattern: string }>,
    ranges: [] as { from: number; to: number }[],
  };

  return {
    calls,
    from(tableName: string) {
      if (tableName !== "cd_keys") {
        throw new Error(`Unexpected table ${tableName}`);
      }

      let idFilter: string | null = null;
      let idInFilter: Set<string> | null = null;
      let selectedColumns = "";
      let rangeFilter: { from: number; to: number } | null = null;
      let withCount = false;
      const ilikeFilters: Array<{ column: string; term: string }> = [];
      const requiredAccessKeySets: string[][] = [];
      const excludedAccessKeySets: string[][] = [];

      const builder = {
        select: (columns?: string, options?: { count?: "exact" }) => {
          selectedColumns = columns ?? "";
          withCount = options?.count === "exact";
          return builder;
        },
        order: () => builder,
        eq: (column: string, value: string) => {
          if (column === "id") {
            idFilter = value;
          }

          return builder;
        },
        in: (column: string, values: string[]) => {
          if (column === "id") {
            idInFilter = new Set(values);
          }

          return builder;
        },
        is: () => builder,
        not: (column: string, operator: string, value: string | null) => {
          if (column === "access_keys_json" && operator === "cd" && typeof value === "string") {
            excludedAccessKeySets.push(JSON.parse(value) as string[]);
          }

          return builder;
        },
        filter: (column: string, operator: string, value: string) => {
          if (column === "access_keys_json" && operator === "cd") {
            requiredAccessKeySets.push(JSON.parse(value) as string[]);
          }

          return builder;
        },
        ilike: (column: string, pattern: string) => {
          calls.ilikeCalls.push({ column, pattern });
          const normalizedTerm = pattern.toLowerCase().replaceAll("%", "").trim();

          if (normalizedTerm.length > 0) {
            ilikeFilters.push({ column, term: normalizedTerm });
          }

          return builder;
        },
        or: (expression: string) => {
          calls.orExpressions.push(expression);
          return builder;
        },
        range: (from: number, to: number) => {
          rangeFilter = { from, to };
          calls.ranges.push({ from, to });
          return builder;
        },
        maybeSingle: async () => {
          const row = seedRows.find((candidateRow) => candidateRow.id === idFilter) ?? null;
          return {
            data: row,
            error: null,
          };
        },
        then: (
          onFulfilled: (value: {
            data: Array<CdKeyRow | { package_id: string; package: CdKeyRow["package"] }>;
            error: null;
            count?: number;
          }) => unknown,
        ) => {
          if (selectedColumns.startsWith("package_id, package:packages")) {
            const byPackage = new Map<string, CdKeyRow>();

            for (const row of seedRows) {
              if (!byPackage.has(row.package_id)) {
                byPackage.set(row.package_id, row);
              }
            }

            const packageRows = [...byPackage.values()].map((row) => ({
              package_id: row.package_id,
              package: row.package,
            }));

            return Promise.resolve({ data: packageRows, error: null }).then(onFulfilled);
          }

          const filteredRows = seedRows.filter((row) => {
            if (idInFilter && !idInFilter.has(row.id)) {
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

          const sortedRows = [...filteredRows].sort((leftRow, rightRow) =>
            rightRow.created_at.localeCompare(leftRow.created_at),
          );
          const rangedRows = rangeFilter ? sortedRows.slice(rangeFilter.from, rangeFilter.to + 1) : sortedRows;

          if (withCount) {
            return Promise.resolve({ data: rangedRows, error: null, count: sortedRows.length }).then(onFulfilled);
          }

          return Promise.resolve({ data: rangedRows, error: null }).then(onFulfilled);
        },
      };

      return builder;
    },
  };
}

describe("integration/admin cdkeys query flow", () => {
  beforeEach(() => {
    mockedCreateInsForgeAdminDatabase.mockReset();
  });

  it("composes admin table query search predicates including used-by username and email", async () => {
    const databaseStub = createAdminCdKeyDatabaseStub([
      {
        id: "cdk-1",
        code: "ALPHA001",
        package_id: "pkg-1",
        duration_days: 30,
        is_extended: true,
        access_keys_json: ["fxreplay:share"],
        amount_rp: 100000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        package: {
          id: "pkg-1",
          name: "Starter",
          is_active: true,
        },
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: {
          user_id: "user-1",
          username: "alice",
          email: "alice@example.com",
          avatar_url: null,
        },
      },
    ]);

    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const table = await getCdKeyTablePage({
      search: "ALICE@EXAMPLE.COM",
      status: null,
      packageId: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });

    expect(databaseStub.calls.orExpressions).toHaveLength(0);
    expect(databaseStub.calls.ilikeCalls).toEqual(
      expect.arrayContaining([
        { column: "code", pattern: "%ALICE@EXAMPLE.COM%" },
        { column: "package.name", pattern: "%ALICE@EXAMPLE.COM%" },
        { column: "used_by_profile.username", pattern: "%ALICE@EXAMPLE.COM%" },
        { column: "used_by_profile.email", pattern: "%ALICE@EXAMPLE.COM%" },
      ]),
    );
    expect(table.items[0]?.packageSummary).toBe("share");
  });

  it("maps detail payload correctly with defensive packageName null handling", async () => {
    const databaseStub = createAdminCdKeyDatabaseStub([
      {
        id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        code: "DETAIL001",
        package_id: "pkg-unknown",
        duration_days: 90,
        is_extended: false,
        access_keys_json: ["fxreplay:private", "fxreplay:share"],
        amount_rp: 250000,
        is_active: true,
        used_at: null,
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-02T00:00:00.000Z",
        package: null,
        created_by_profile: {
          user_id: "admin-1",
          username: "admin",
          email: "admin@example.com",
          avatar_url: null,
        },
        used_by_profile: null,
      },
    ]);

    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const detail = await getCdKeyDetailSnapshot({ id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7" });

    expect(detail).toEqual({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      code: "DETAIL001",
      packageId: "pkg-unknown",
      packageName: null,
      packageSummary: "mixed",
      amountRp: 250000,
      durationDays: 90,
      isExtended: false,
      accessKeys: ["fxreplay:private", "fxreplay:share"],
      isActive: true,
      createdBy: {
        userId: "admin-1",
        username: "admin",
        email: "admin@example.com",
        avatarUrl: null,
      },
      usedBy: null,
      usedAt: null,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
    });
  });
});
