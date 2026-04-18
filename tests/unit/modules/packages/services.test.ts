import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/packages/repositories", () => ({
  countPackageTotalUsed: vi.fn(),
  createPackageRow: vi.fn(),
  getPackageById: vi.fn(),
  getPackageRowById: vi.fn(),
  getPackageSummary: vi.fn(),
  listPackageRowsByIds: vi.fn(),
  togglePackageActiveRow: vi.fn(),
  updatePackageRow: vi.fn(),
}));

import * as packageRepositories from "@/modules/packages/repositories";
import { getIssuablePackageSnapshotById, getIssuablePackageSnapshotsByIds } from "@/modules/packages/services";

import type { PackageRow } from "@/modules/packages/types";

const mockedGetPackageRowById = vi.mocked(packageRepositories.getPackageRowById);
const mockedListPackageRowsByIds = vi.mocked(packageRepositories.listPackageRowsByIds);

function createPackageRowFixture(overrides: Partial<PackageRow> = {}): PackageRow {
  return {
    accessKeys: ["tradingview:private", "fxreplay:share"],
    amountRp: 150000,
    checkoutUrl: null,
    code: "PKG-ABC123",
    createdAt: "2026-01-01T00:00:00.000Z",
    durationDays: 30,
    id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    isActive: true,
    isExtended: true,
    name: "Starter Package",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("packages/services getIssuablePackageSnapshotById", () => {
  beforeEach(() => {
    mockedGetPackageRowById.mockResolvedValue(createPackageRowFixture());
    mockedListPackageRowsByIds.mockReset();
  });

  it("throws when package is not found", async () => {
    mockedGetPackageRowById.mockResolvedValueOnce(null);

    await expect(getIssuablePackageSnapshotById("f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7")).rejects.toThrow(
      "Package not found.",
    );
  });

  it("throws when package is inactive", async () => {
    mockedGetPackageRowById.mockResolvedValueOnce(createPackageRowFixture({ isActive: false }));

    await expect(getIssuablePackageSnapshotById("f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7")).rejects.toThrow(
      "Package is disabled.",
    );
  });

  it("returns canonical access keys with derived summary", async () => {
    mockedGetPackageRowById.mockResolvedValueOnce(
      createPackageRowFixture({
        accessKeys: ["fxreplay:share", "tradingview:private", "fxreplay:private"],
      }),
    );

    await expect(getIssuablePackageSnapshotById("f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7")).resolves.toEqual({
      accessKeys: ["tradingview:private", "fxreplay:private", "fxreplay:share"],
      amountRp: 150000,
      durationDays: 30,
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      isExtended: true,
      name: "Starter Package",
      summary: "mixed",
    });
  });
});

describe("packages/services getIssuablePackageSnapshotsByIds", () => {
  beforeEach(() => {
    mockedListPackageRowsByIds.mockReset();
  });

  it("returns snapshots in requested order with canonicalized access keys", async () => {
    mockedListPackageRowsByIds.mockResolvedValueOnce([
      createPackageRowFixture({
        id: "pkg-b",
        name: "Package B",
        accessKeys: ["fxreplay:share", "tradingview:private"],
      }),
      createPackageRowFixture({
        id: "pkg-a",
        name: "Package A",
        accessKeys: ["fxreplay:private"],
      }),
    ]);

    await expect(getIssuablePackageSnapshotsByIds(["pkg-a", "pkg-b"])).resolves.toEqual([
      {
        id: "pkg-a",
        name: "Package A",
        amountRp: 150000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["fxreplay:private"],
        summary: "private",
      },
      {
        id: "pkg-b",
        name: "Package B",
        amountRp: 150000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private", "fxreplay:share"],
        summary: "mixed",
      },
    ]);

    expect(mockedListPackageRowsByIds).toHaveBeenCalledWith(["pkg-a", "pkg-b"]);
  });

  it("throws when one requested package does not exist", async () => {
    mockedListPackageRowsByIds.mockResolvedValueOnce([createPackageRowFixture({ id: "pkg-a" })]);

    await expect(getIssuablePackageSnapshotsByIds(["pkg-a", "pkg-missing"])).rejects.toThrow("Package not found.");
  });

  it("throws when one requested package is disabled", async () => {
    mockedListPackageRowsByIds.mockResolvedValueOnce([
      createPackageRowFixture({ id: "pkg-a" }),
      createPackageRowFixture({ id: "pkg-b", isActive: false }),
    ]);

    await expect(getIssuablePackageSnapshotsByIds(["pkg-a", "pkg-b"])).rejects.toThrow("Package is disabled.");
  });
});
