import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/cdkeys/actions", () => ({
  getCdKeyDetailSnapshotAction: vi.fn(),
  getCdKeyTablePageAction: vi.fn(),
  listIssuablePackagesAction: vi.fn(),
}));

import * as adminCdKeyActions from "@/modules/admin/cdkeys/actions";
import {
  fetchCdKeyDetailSnapshot,
  fetchCdKeyTablePage,
  fetchIssuablePackages,
} from "@/app/(admin)/admin/cdkey/_components/cdkey-query";

const mockedGetCdKeyTablePageAction = vi.mocked(adminCdKeyActions.getCdKeyTablePageAction);
const mockedGetCdKeyDetailSnapshotAction = vi.mocked(adminCdKeyActions.getCdKeyDetailSnapshotAction);
const mockedListIssuablePackagesAction = vi.mocked(adminCdKeyActions.listIssuablePackagesAction);

describe("admin/cdkeys/cdkey-query", () => {
  beforeEach(() => {
    mockedGetCdKeyTablePageAction.mockReset();
    mockedGetCdKeyDetailSnapshotAction.mockReset();
    mockedListIssuablePackagesAction.mockReset();
  });

  it("unwraps successful table payload", async () => {
    mockedGetCdKeyTablePageAction.mockResolvedValueOnce({
      data: {
        ok: true,
        tablePage: {
          items: [],
          packageOptions: [],
          page: 1,
          pageSize: 10,
          totalCount: 0,
        },
      },
    } as Awaited<ReturnType<typeof adminCdKeyActions.getCdKeyTablePageAction>>);

    await expect(
      fetchCdKeyTablePage({
        search: null,
        status: null,
        packageId: null,
        packageSummary: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [],
      packageOptions: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("throws validation form error when action returns validationErrors", async () => {
    mockedGetCdKeyDetailSnapshotAction.mockResolvedValueOnce({
      validationErrors: {
        formErrors: ["CD key ID is invalid."],
      },
      data: {
        ok: false,
        message: "Failed to load CD key detail.",
      },
    } as Awaited<ReturnType<typeof adminCdKeyActions.getCdKeyDetailSnapshotAction>>);

    await expect(fetchCdKeyDetailSnapshot({ id: "invalid-id" })).rejects.toThrow("CD key ID is invalid.");
  });

  it("throws action message when result has ok false", async () => {
    mockedListIssuablePackagesAction.mockResolvedValueOnce({
      data: {
        ok: false,
        message: "Failed to load issuable packages.",
      },
    } as Awaited<ReturnType<typeof adminCdKeyActions.listIssuablePackagesAction>>);

    await expect(fetchIssuablePackages()).rejects.toThrow("Failed to load issuable packages.");
  });
});
