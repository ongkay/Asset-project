import { describe, expect, it } from "vitest";

import { shouldApplyAssetDetailResponse } from "@/app/(member)/console/_components/console-asset-detail-dialog/console-asset-detail-dialog";

describe("app/member/console-asset-detail-dialog", () => {
  it("ignores stale responses when the user already switched to another asset", () => {
    expect(
      shouldApplyAssetDetailResponse({
        currentAssetId: "asset-b",
        currentRequestKey: 2,
        requestAssetId: "asset-a",
        responseRequestKey: 1,
      }),
    ).toBe(false);
  });

  it("applies only the latest response for the currently selected asset", () => {
    expect(
      shouldApplyAssetDetailResponse({
        currentAssetId: "asset-b",
        currentRequestKey: 2,
        requestAssetId: "asset-b",
        responseRequestKey: 2,
      }),
    ).toBe(true);
  });
});
