import { describe, expect, it } from "vitest";

import {
  assetFormSchema,
  parseAssetExpiresAtToUtcIso,
  parseAssetJsonText,
  toAssetFormInput,
} from "@/modules/assets/schemas";

describe("assets/schemas", () => {
  it("accepts object JSON payloads", () => {
    expect(parseAssetJsonText('{"token":"value"}')).toEqual({ token: "value" });
  });

  it("accepts array JSON payloads", () => {
    expect(parseAssetJsonText('[{"token":"value"}]')).toEqual([{ token: "value" }]);
  });

  it("rejects invalid JSON strings", () => {
    expect(() => parseAssetJsonText("{invalid-json}")).toThrow("Asset JSON must be a valid JSON string.");
  });

  it("rejects primitive top-level JSON values", () => {
    expect(() => parseAssetJsonText("42")).toThrow("Asset JSON top-level value must be an object or an array.");
  });

  it("rejects expiry values without timezone information", () => {
    expect(() => parseAssetExpiresAtToUtcIso("2026-06-10T12:00:00")).toThrow(
      "Expiry must include timezone information.",
    );
  });

  it("rejects invalid expiry values", () => {
    expect(() => parseAssetExpiresAtToUtcIso("not-a-dateZ")).toThrow("Expiry must be a valid ISO-8601 datetime.");
  });

  it("normalizes expiry values to UTC ISO", () => {
    expect(parseAssetExpiresAtToUtcIso("2026-06-10T12:00:00+07:00")).toBe("2026-06-10T05:00:00.000Z");
  });

  it("normalizes empty optional note and proxy to null", () => {
    const parsed = assetFormSchema.parse({
      platform: "tradingview",
      assetType: "private",
      account: "account@example.com",
      note: "   ",
      proxy: "   ",
      assetJsonText: "{}",
      expiresAt: "2026-06-10T12:00:00Z",
    });

    expect(parsed.note).toBeNull();
    expect(parsed.proxy).toBeNull();
  });

  it("converts valid form values to domain input", () => {
    expect(
      toAssetFormInput({
        platform: "fxreplay",
        assetType: "share",
        account: " account@example.com ",
        note: " Shared account ",
        proxy: " https://proxy.example.com ",
        assetJsonText: '{"session":"abc"}',
        expiresAt: "2026-06-10T12:00:00+07:00",
      }),
    ).toEqual({
      platform: "fxreplay",
      assetType: "share",
      account: "account@example.com",
      note: "Shared account",
      proxy: "https://proxy.example.com",
      assetJson: { session: "abc" },
      expiresAt: "2026-06-10T05:00:00.000Z",
    });
  });

  it("accepts already expired expiry values", () => {
    expect(
      toAssetFormInput({
        platform: "tradingview",
        assetType: "private",
        account: "expired@example.com",
        note: null,
        proxy: null,
        assetJsonText: "[]",
        expiresAt: "2020-01-01T00:00:00Z",
      }),
    ).toMatchObject({
      expiresAt: "2020-01-01T00:00:00.000Z",
      assetJson: [],
    });
  });
});
