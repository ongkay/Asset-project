import { describe, expect, it } from "vitest";

import { parsePackageAccessKeysFromReadPath } from "@/modules/packages/access-keys";

describe("packages/schemas read-path access keys", () => {
  it("sorts valid legacy access keys into canonical order", () => {
    expect(parsePackageAccessKeysFromReadPath(["fxreplay:share", "tradingview:private"])).toEqual([
      "tradingview:private",
      "fxreplay:share",
    ]);
  });

  it("drops malformed legacy values without throwing", () => {
    expect(
      parsePackageAccessKeysFromReadPath(["fxreplay:share", "invalid:key", 123, null, "tradingview:private"]),
    ).toEqual(["tradingview:private", "fxreplay:share"]);
  });

  it("returns an empty array for non-array legacy payloads", () => {
    expect(parsePackageAccessKeysFromReadPath(null)).toEqual([]);
    expect(parsePackageAccessKeysFromReadPath({ access: ["tradingview:private"] })).toEqual([]);
  });
});
