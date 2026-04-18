import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/cdkeys/repositories", () => ({
  createCdKeyRow: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: vi.fn(),
}));

vi.mock("@/modules/packages/services", () => ({
  getIssuablePackageSnapshotById: vi.fn(),
}));

import * as cdKeyRepositories from "@/modules/cdkeys/repositories";
import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import * as packageServices from "@/modules/packages/services";
import { createCdKey, generateCdKeyCode } from "@/modules/cdkeys/services";

const mockedCreateCdKeyRow = vi.mocked(cdKeyRepositories.createCdKeyRow);
const mockedCreateInsForgeAdminDatabase = vi.mocked(createInsForgeAdminDatabase);
const mockedGetIssuablePackageSnapshotById = vi.mocked(packageServices.getIssuablePackageSnapshotById);

describe("cdkeys/services", () => {
  beforeEach(() => {
    mockedCreateCdKeyRow.mockReset();
    mockedCreateInsForgeAdminDatabase.mockReset();
    mockedGetIssuablePackageSnapshotById.mockReset();
  });

  it("generates 10-char uppercase alphanumeric code", () => {
    const generatedCode = generateCdKeyCode();

    expect(generatedCode).toMatch(/^[A-Z0-9]{10}$/);
  });

  it("creates cd key from package snapshot when override is null", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValueOnce({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });
    mockedCreateCdKeyRow.mockResolvedValueOnce({
      id: "cdkey-1",
      code: "AB12CD34EF",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
      isActive: true,
      usedBy: null,
      usedAt: null,
      createdBy: "admin-user-id",
    });

    const row = await createCdKey(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: null,
        amountRpOverride: null,
      },
      "admin-user-id",
    );

    expect(mockedCreateCdKeyRow).toHaveBeenCalledWith({
      code: expect.stringMatching(/^[A-Z0-9]{10}$/),
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      createdBy: "admin-user-id",
    });
    expect(row.id).toBe("cdkey-1");
  });

  it("does not use seed RPC path during live issuance", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValueOnce({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });
    mockedCreateCdKeyRow.mockResolvedValueOnce({
      id: "cdkey-rpc-guard",
      code: "ZXCVBN12AS",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
      isActive: true,
      usedBy: null,
      usedAt: null,
      createdBy: "admin-user-id",
    });

    await createCdKey(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: "ZXCVBN12AS",
        amountRpOverride: null,
      },
      "admin-user-id",
    );

    expect(mockedCreateInsForgeAdminDatabase).not.toHaveBeenCalled();
  });

  it("uses manual code and amount override when provided", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValueOnce({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });
    mockedCreateCdKeyRow.mockResolvedValueOnce({
      id: "cdkey-2",
      code: "ZXCVBN12AS",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      amountRp: 200000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
      isActive: true,
      usedBy: null,
      usedAt: null,
      createdBy: "admin-user-id",
    });

    const row = await createCdKey(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: "ZXCVBN12AS",
        amountRpOverride: 200000,
      },
      "admin-user-id",
    );

    expect(mockedCreateCdKeyRow).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ZXCVBN12AS",
        amountRp: 200000,
      }),
    );
    expect(row.amountRp).toBe(200000);
  });

  it("rejects issuance when package is inactive", async () => {
    mockedGetIssuablePackageSnapshotById.mockRejectedValueOnce(new Error("Package is disabled."));

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

    expect(mockedCreateCdKeyRow).not.toHaveBeenCalled();
  });

  it("retries deterministic generated codes on unique conflict", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValue({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });

    mockedCreateCdKeyRow
      .mockRejectedValueOnce({
        code: "23505",
        message: "duplicate key value violates unique constraint cd_keys_code_key",
      })
      .mockResolvedValueOnce({
        id: "cdkey-3",
        code: "BBBBBBBBBB",
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        amountRp: 150000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
        isActive: true,
        usedBy: null,
        usedAt: null,
        createdBy: "admin-user-id",
      });

    const generatedCodes = ["AAAAAAAAAA", "BBBBBBBBBB"];
    let nextGeneratedCodeIndex = 0;

    const row = await createCdKey(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: null,
        amountRpOverride: null,
      },
      "admin-user-id",
      () => {
        const code = generatedCodes[nextGeneratedCodeIndex];

        if (!code) {
          throw new Error("Test generator exhausted.");
        }

        nextGeneratedCodeIndex += 1;
        return code;
      },
    );

    expect(mockedCreateCdKeyRow).toHaveBeenNthCalledWith(1, expect.objectContaining({ code: "AAAAAAAAAA" }));
    expect(mockedCreateCdKeyRow).toHaveBeenNthCalledWith(2, expect.objectContaining({ code: "BBBBBBBBBB" }));
    expect(row.code).toBe("BBBBBBBBBB");
  });

  it("fails after retry exhaustion on repeated unique conflicts", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValue({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });

    mockedCreateCdKeyRow.mockRejectedValue({
      code: "23505",
      message: "duplicate key value violates unique constraint cd_keys_code_key",
    });

    const generatedCodes = Array.from({ length: 10 }, (_, index) => `AAAAAAAAA${index}`);
    let nextGeneratedCodeIndex = 0;

    await expect(
      createCdKey(
        {
          packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          manualCode: null,
          amountRpOverride: null,
        },
        "admin-user-id",
        () => {
          const code = generatedCodes[nextGeneratedCodeIndex];

          if (!code) {
            throw new Error("Test generator exhausted.");
          }

          nextGeneratedCodeIndex += 1;
          return code;
        },
      ),
    ).rejects.toThrow("Failed to generate a unique CD-Key code.");

    expect(mockedCreateCdKeyRow).toHaveBeenCalledTimes(10);
  });

  it("returns deterministic message on non-unique DB failure", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValueOnce({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });

    mockedCreateCdKeyRow.mockRejectedValueOnce({
      code: "23514",
      message: 'new row for relation "cd_keys" violates check constraint',
    });

    await expect(
      createCdKey(
        {
          packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          manualCode: "ZXCVBN12AS",
          amountRpOverride: null,
        },
        "admin-user-id",
      ),
    ).rejects.toThrow("Failed to create CD-Key.");
  });

  it("returns deterministic duplicate message on manual code conflict", async () => {
    mockedGetIssuablePackageSnapshotById.mockResolvedValueOnce({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      name: "Starter Package",
      accessKeys: ["tradingview:private"],
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      summary: "private",
    });

    mockedCreateCdKeyRow.mockRejectedValueOnce({
      code: "23505",
      message: "duplicate key value violates unique constraint cd_keys_code_key",
    });

    await expect(
      createCdKey(
        {
          packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
          manualCode: "ZXCVBN12AS",
          amountRpOverride: null,
        },
        "admin-user-id",
      ),
    ).rejects.toThrow("CD-Key code already exists.");
  });
});
