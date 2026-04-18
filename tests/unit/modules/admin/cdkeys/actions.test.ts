import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-user-id",
    profile: {
      role: "admin",
    },
  }),
}));

vi.mock("@/modules/admin/cdkeys/queries", () => ({
  getCdKeyDetailSnapshot: vi.fn(),
  getCdKeyTablePage: vi.fn(),
  listIssuablePackages: vi.fn(),
}));

import * as adminCdKeyQueries from "@/modules/admin/cdkeys/queries";
import {
  getCdKeyDetailSnapshotAction,
  getCdKeyTablePageAction,
  listIssuablePackagesAction,
} from "@/modules/admin/cdkeys/actions";

const mockedGetCdKeyTablePage = vi.mocked(adminCdKeyQueries.getCdKeyTablePage);
const mockedGetCdKeyDetailSnapshot = vi.mocked(adminCdKeyQueries.getCdKeyDetailSnapshot);
const mockedListIssuablePackages = vi.mocked(adminCdKeyQueries.listIssuablePackages);
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("admin/cdkeys/actions", () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetCdKeyTablePage.mockReset();
    mockedGetCdKeyDetailSnapshot.mockReset();
    mockedListIssuablePackages.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rejects invalid package summary before table query execution", async () => {
    const result = await getCdKeyTablePageAction({
      search: null,
      status: null,
      packageId: null,
      packageSummary: "vip" as never,
      page: 1,
      pageSize: 10,
    });

    expect(result?.validationErrors?.fieldErrors.packageSummary).toBeTruthy();
    expect(mockedGetCdKeyTablePage).not.toHaveBeenCalled();
  });

  it("returns deterministic ok false payload on table query failure", async () => {
    mockedGetCdKeyTablePage.mockRejectedValueOnce(new Error("database failed"));

    const result = await getCdKeyTablePageAction({
      search: null,
      status: null,
      packageId: null,
      packageSummary: null,
      page: 1,
      pageSize: 10,
    });

    expect(result?.data).toEqual({
      ok: false,
      message: "Failed to load CD key table.",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith("[admin.cdkeys.get-table-page] failed", {
      message: "database failed",
      code: undefined,
      details: undefined,
      hint: undefined,
    });
  });

  it("rejects invalid detail id before query execution", async () => {
    await expect(getCdKeyDetailSnapshotAction({ id: "cd-1" })).resolves.toEqual({
      validationErrors: {
        formErrors: [],
        fieldErrors: {
          id: ["CD key ID is invalid."],
        },
      },
    });
    expect(mockedGetCdKeyDetailSnapshot).not.toHaveBeenCalled();
  });

  it("returns deterministic ok true payload for detail reads", async () => {
    mockedGetCdKeyDetailSnapshot.mockResolvedValueOnce({
      id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      code: "ABC12345",
      packageId: "pkg-1",
      packageName: "Starter",
      packageSummary: "private",
      amountRp: 100000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
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
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    const result = await getCdKeyDetailSnapshotAction({ id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7" });

    expect(result?.data).toEqual({
      ok: true,
      detail: {
        id: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        code: "ABC12345",
        packageId: "pkg-1",
        packageName: "Starter",
        packageSummary: "private",
        amountRp: 100000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
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
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    });
  });

  it("returns deterministic ok true payload for issuable package list", async () => {
    mockedListIssuablePackages.mockResolvedValueOnce([
      {
        packageId: "pkg-1",
        name: "Starter",
        amountRp: 100000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
        packageSummary: "private",
      },
    ]);

    const result = await listIssuablePackagesAction({});

    expect(result?.data).toEqual({
      ok: true,
      packages: [
        {
          packageId: "pkg-1",
          name: "Starter",
          amountRp: 100000,
          durationDays: 30,
          isExtended: true,
          accessKeys: ["tradingview:private"],
          packageSummary: "private",
        },
      ],
    });
  });
});
