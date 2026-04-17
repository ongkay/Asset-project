import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryRow = Record<string, unknown>;

type QueryDataset = {
  profileRows?: QueryRow[];
  subscriptionRows?: QueryRow[];
};

const { mockedCreateInsForgeServerDatabase } = vi.hoisted(() => ({
  mockedCreateInsForgeServerDatabase: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeServerDatabase: mockedCreateInsForgeServerDatabase,
}));

import { listAdminUserSubscriptionsByUserIds } from "@/modules/admin/users/repositories";

function createQueryBuilder(rows: QueryRow[]) {
  let resultRows = [...rows];

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
    range(start: number, end: number) {
      resultRows = resultRows.slice(start, end + 1);
      return builder;
    },
    select: vi.fn((_fields?: string, _options?: object) => builder),
    then(onFulfilled: (value: { count?: number; data: QueryRow[]; error: null }) => unknown) {
      return Promise.resolve(onFulfilled({ count: resultRows.length, data: resultRows, error: null }));
    },
  };

  return builder;
}

function installDatabaseFixture(dataset: QueryDataset) {
  mockedCreateInsForgeServerDatabase.mockReturnValue({
    from(tableName: string) {
      if (tableName === "profiles") {
        return createQueryBuilder(dataset.profileRows ?? []);
      }

      if (tableName === "subscriptions") {
        return createQueryBuilder(dataset.subscriptionRows ?? []);
      }

      throw new Error(`Unhandled table mock: ${tableName}`);
    },
  });
}

describe("admin/users/repositories", () => {
  beforeEach(() => {
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
});
