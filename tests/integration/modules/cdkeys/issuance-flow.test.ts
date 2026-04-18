import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { createCdKey } from "@/modules/cdkeys/services";

type PackageTableRow = {
  id: string;
  name: string;
  code: string;
  amount_rp: number;
  duration_days: number;
  checkout_url: string | null;
  is_active: boolean;
  is_extended: boolean;
  access_keys_json: string[];
  created_at: string;
  updated_at: string;
};

type CdKeyInsertRow = {
  code: string;
  package_id: string;
  duration_days: number;
  is_extended: boolean;
  access_keys_json: string[];
  amount_rp: number;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  is_active: boolean;
};

const mockedCreateInsForgeAdminDatabase = vi.mocked(createInsForgeAdminDatabase);

function createIssuanceDatabaseStub(input: { packageRows: PackageTableRow[]; conflictCodes?: string[] }) {
  const conflicts = new Map<string, number>();

  for (const code of input.conflictCodes ?? []) {
    conflicts.set(code, (conflicts.get(code) ?? 0) + 1);
  }

  const calls = {
    insertAttempts: [] as string[],
    insertedRows: [] as CdKeyInsertRow[],
    rpcCount: 0,
  };

  let generatedId = 1;

  return {
    calls,
    rpc() {
      calls.rpcCount += 1;
      throw new Error("Unexpected rpc call during CD key issuance flow.");
    },
    from(tableName: string) {
      if (tableName === "packages") {
        let eqId: string | null = null;

        const builder = {
          select: () => builder,
          eq: (column: string, value: string) => {
            if (column === "id") {
              eqId = value;
            }

            return builder;
          },
          maybeSingle: async () => {
            const row = input.packageRows.find((candidateRow) => candidateRow.id === eqId) ?? null;
            return {
              data: row,
              error: null,
            };
          },
        };

        return builder;
      }

      if (tableName === "cd_keys") {
        let pendingInsertRow: CdKeyInsertRow | null = null;

        const builder = {
          insert: (rows: CdKeyInsertRow[]) => {
            pendingInsertRow = rows[0] ?? null;
            return builder;
          },
          select: () => builder,
          single: async () => {
            if (!pendingInsertRow) {
              throw new Error("Insert payload is missing.");
            }

            calls.insertAttempts.push(pendingInsertRow.code);

            const remainingConflictCount = conflicts.get(pendingInsertRow.code) ?? 0;

            if (remainingConflictCount > 0) {
              conflicts.set(pendingInsertRow.code, remainingConflictCount - 1);

              return {
                data: null,
                error: {
                  code: "23505",
                  message: "duplicate key value violates unique constraint cd_keys_code_key",
                },
              };
            }

            calls.insertedRows.push(pendingInsertRow);

            const persistedRow = {
              id: `cdkey-${generatedId}`,
              code: pendingInsertRow.code,
              package_id: pendingInsertRow.package_id,
              duration_days: pendingInsertRow.duration_days,
              is_extended: pendingInsertRow.is_extended,
              access_keys_json: pendingInsertRow.access_keys_json,
              amount_rp: pendingInsertRow.amount_rp,
              is_active: pendingInsertRow.is_active,
              used_by: pendingInsertRow.used_by,
              used_at: pendingInsertRow.used_at,
              created_by: pendingInsertRow.created_by,
            };

            generatedId += 1;

            return {
              data: persistedRow,
              error: null,
            };
          },
        };

        return builder;
      }

      throw new Error(`Unexpected table ${tableName}`);
    },
  };
}

describe("integration/cdkeys issuance flow", () => {
  beforeEach(() => {
    mockedCreateInsForgeAdminDatabase.mockReset();
  });

  it("hydrates canonical package snapshot and performs create-only insert semantics", async () => {
    const databaseStub = createIssuanceDatabaseStub({
      packageRows: [
        {
          id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          name: "Starter",
          code: "PKG-STARTER",
          amount_rp: 150000,
          duration_days: 30,
          checkout_url: null,
          is_active: true,
          is_extended: true,
          access_keys_json: ["fxreplay:share", "tradingview:private", "fxreplay:private"],
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
    });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const row = await createCdKey(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: "ZXCVBN12AS",
        amountRpOverride: null,
      },
      "admin-user-id",
    );

    expect(row.code).toBe("ZXCVBN12AS");
    expect(databaseStub.calls.insertAttempts).toEqual(["ZXCVBN12AS"]);
    expect(databaseStub.calls.insertedRows).toEqual([
      expect.objectContaining({
        code: "ZXCVBN12AS",
        created_by: "admin-user-id",
        used_by: null,
        used_at: null,
        is_active: true,
        access_keys_json: ["tradingview:private", "fxreplay:private", "fxreplay:share"],
      }),
    ]);
    expect(databaseStub.calls.rpcCount).toBe(0);
  });

  it("retries generated-code collision and persists only the successful insert", async () => {
    const databaseStub = createIssuanceDatabaseStub({
      packageRows: [
        {
          id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          name: "Starter",
          code: "PKG-STARTER",
          amount_rp: 150000,
          duration_days: 30,
          checkout_url: null,
          is_active: true,
          is_extended: true,
          access_keys_json: ["tradingview:private"],
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      conflictCodes: ["AAAAAAAAAA"],
    });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    const generatedCodes = ["AAAAAAAAAA", "BBBBBBBBBB"];
    let generatedCodeIndex = 0;

    const row = await createCdKey(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: null,
        amountRpOverride: null,
      },
      "admin-user-id",
      () => {
        const nextCode = generatedCodes[generatedCodeIndex];

        if (!nextCode) {
          throw new Error("Generated code fixture exhausted.");
        }

        generatedCodeIndex += 1;
        return nextCode;
      },
    );

    expect(row.code).toBe("BBBBBBBBBB");
    expect(databaseStub.calls.insertAttempts).toEqual(["AAAAAAAAAA", "BBBBBBBBBB"]);
    expect(databaseStub.calls.insertedRows).toHaveLength(1);
    expect(databaseStub.calls.insertedRows[0]?.code).toBe("BBBBBBBBBB");
  });

  it("rejects disabled package with no row creation", async () => {
    const databaseStub = createIssuanceDatabaseStub({
      packageRows: [
        {
          id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          name: "Starter",
          code: "PKG-STARTER",
          amount_rp: 150000,
          duration_days: 30,
          checkout_url: null,
          is_active: false,
          is_extended: true,
          access_keys_json: ["tradingview:private"],
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
    });
    mockedCreateInsForgeAdminDatabase.mockReturnValue(databaseStub as never);

    await expect(
      createCdKey(
        {
          packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          manualCode: null,
          amountRpOverride: null,
        },
        "admin-user-id",
      ),
    ).rejects.toThrow("Package is disabled.");

    expect(databaseStub.calls.insertAttempts).toHaveLength(0);
    expect(databaseStub.calls.insertedRows).toHaveLength(0);
    expect(databaseStub.calls.rpcCount).toBe(0);
  });
});
