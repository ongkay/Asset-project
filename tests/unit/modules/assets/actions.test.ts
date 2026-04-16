import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-user-id",
    profile: {
      role: "admin",
    },
  }),
}));

vi.mock("@/modules/assets/services", () => ({
  createAsset: vi.fn(),
  deleteAssetSafely: vi.fn(),
  toggleAssetDisabled: vi.fn(),
  updateAsset: vi.fn(),
}));

import * as assetServices from "@/modules/assets/services";
import { createAssetAction } from "@/modules/assets/actions";

const mockedCreateAsset = vi.mocked(assetServices.createAsset);

describe("assets/actions", () => {
  beforeEach(() => {
    mockedCreateAsset.mockReset();
  });

  it("rejects malformed create payloads before persistence is attempted", async () => {
    const result = await createAssetAction({
      platform: "tradingview",
      assetType: "private",
      account: "invalid@example.com",
      note: "task013-invalid-mutation-note",
      proxy: null,
      assetJsonText: "not-json",
      expiresAt: "2026-06-10T12:00:00",
    });

    expect(result?.validationErrors?.fieldErrors.assetJsonText).toContain(
      "Asset JSON must be valid JSON with top-level object or array.",
    );
    expect(result?.validationErrors?.fieldErrors.expiresAt).toContain("Expiry must include timezone information.");
    expect(mockedCreateAsset).not.toHaveBeenCalled();
  });
});
