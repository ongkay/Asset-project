import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryRow = Record<string, unknown>;

type QueryDataset = {
  profileRows?: QueryRow[];
  subscriptionRows?: QueryRow[];
};

const { mockedCreateInsForgeServerDatabase } = vi.hoisted(() => ({
  mockedCreateInsForgeServerDatabase: vi.fn(),
}));

const { mockedCreateInsForgeAdminDatabase } = vi.hoisted(() => ({
  mockedCreateInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: mockedCreateInsForgeAdminDatabase,
  createInsForgeServerDatabase: mockedCreateInsForgeServerDatabase,
}));

import {
  listAdminUserSubscriptionsByUserIds,
  listAdminUserTableProfilesPage,
} from "@/modules/admin/users/repositories";

function createQueryBuilder(rows: QueryRow[]) {
  let resultRows = [...rows];
  let lastOrFilter = "";

  const builder = {
    eq(column: string, value: unknown) {
      resultRows = resultRows.filter((row) => row[column] === value);
      return builder;
    },
    in(column: string, values: unknown[]) {
      resultRows = resultRows.filter((row) => values.includes(row[column]));
      return builder;
    },
    limit(count: number) {
      resultRows = resultRows.slice(0, count);
      return builder;
    },
    maybeSingle: vi.fn(async () => ({
      data: resultRows[0] ?? null,
      error: null,
    })),
    order() {
      return builder;
    },
    or(filter: string) {
      lastOrFilter = filter;
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
  let getLastProfilesOrFilter = () => "";

  const database = {
    from(tableName: string) {
      if (tableName === "profiles") {
        const queryBuilder = createQueryBuilder(dataset.profileRows ?? []);
        getLastProfilesOrFilter = queryBuilder.getLastOrFilter;
        return queryBuilder.builder;
      }

      if (tableName === "subscriptions") {
        return createQueryBuilder(dataset.subscriptionRows ?? []).builder;
      }

      throw new Error(`Unhandled table mock: ${tableName}`);
    },
  };

  mockedCreateInsForgeAdminDatabase.mockReturnValue(database);
  mockedCreateInsForgeServerDatabase.mockReturnValue(database);

  return {
    getLastProfilesOrFilter: () => getLastProfilesOrFilter(),
  };
}

describe("admin/users/repositories", () => {
  beforeEach(() => {
    mockedCreateInsForgeAdminDatabase.mockReset();
    mockedCreateInsForgeServerDatabase.mockReset();
  });

  it("rejects malformed subscription access keys instead of unsafe-casting them", async () => {
    installDatabaseFixture({
      subscriptionRows: [
        {
          id: "sub-1",
          user_id: "user-1",
          package_id: "pkg-1",
          package_name: "Broken Plan",
          access_keys_json: ["tradingview:vip"],
          status: "active",
          start_at: "2026-04-01T00:00:00.000Z",
          end_at: "2099-05-01T00:00:00.000Z",
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-05T00:00:00.000Z",
        },
      ],
    });

    await expect(listAdminUserSubscriptionsByUserIds(["user-1"])).rejects.toThrowError();
  });

  it("escapes ilike wildcard and parser control characters before building the users table filter", async () => {
    const databaseFixture = installDatabaseFixture({
      profileRows: [],
    });

    await listAdminUserTableProfilesPage({
      page: 1,
      pageSize: 10,
      role: null,
      search: "%a_b,()",
    });

    expect(databaseFixture.getLastProfilesOrFilter()).toContain("email.ilike.%\\%a\\_b\\,\\(\\)%");
    expect(databaseFixture.getLastProfilesOrFilter()).toContain("username.ilike.%\\%a\\_b\\,\\(\\)%");
    expect(databaseFixture.getLastProfilesOrFilter()).toContain("public_id.ilike.%\\%a\\_b\\,\\(\\)%");
  });
});
