import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-user-id",
    profile: {
      role: "admin",
    },
  }),
}));

vi.mock("@/modules/admin/assets/queries", () => ({
  getAssetEditorData: vi.fn(),
  getAssetTablePage: vi.fn(),
}));

import * as adminAssetQueries from "@/modules/admin/assets/queries";
import { getAssetTablePageAction } from "@/modules/admin/assets/actions";

const mockedGetAssetTablePage = vi.mocked(adminAssetQueries.getAssetTablePage);

describe("admin/assets/actions", () => {
  beforeEach(() => {
    mockedGetAssetTablePage.mockReset();
  });

  it("rejects reversed expiry ranges before query execution", async () => {
    const result = await getAssetTablePageAction({
      search: null,
      assetType: null,
      status: null,
      expiresFrom: "2026-06-30",
      expiresTo: "2026-06-01",
      page: 1,
      pageSize: 10,
    });

    expect(result?.validationErrors?.fieldErrors.expiresTo).toContain(
      "Expiry start date cannot be later than expiry end date.",
    );
    expect(mockedGetAssetTablePage).not.toHaveBeenCalled();
  });
});
