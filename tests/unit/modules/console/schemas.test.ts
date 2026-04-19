import { describe, expect, it } from "vitest";

import {
  consoleAssetDetailActionInputSchema,
  parseConsolePaymentErrorSearchParam,
  parsePaymentDummyPackageIdSearchParam,
} from "@/modules/console/schemas";

describe("parseConsolePaymentErrorSearchParam", () => {
  it("returns the accepted payment error key", () => {
    expect(parseConsolePaymentErrorSearchParam({ paymentError: "missing-package" })).toBe("missing-package");
    expect(parseConsolePaymentErrorSearchParam({ paymentError: ["disabled-package", "ignored"] })).toBe(
      "disabled-package",
    );
  });

  it("ignores unknown payment error keys safely", () => {
    expect(parseConsolePaymentErrorSearchParam({ paymentError: "unexpected" })).toBeNull();
    expect(parseConsolePaymentErrorSearchParam({ paymentError: "   " })).toBeNull();
    expect(parseConsolePaymentErrorSearchParam({})).toBeNull();
  });
});

describe("parsePaymentDummyPackageIdSearchParam", () => {
  it("returns a valid package id", () => {
    expect(parsePaymentDummyPackageIdSearchParam({ packageId: "11111111-1111-4111-8111-111111111111" })).toEqual({
      packageId: "11111111-1111-4111-8111-111111111111",
      paymentError: null,
    });
  });

  it("maps missing package ids to the route-level error contract", () => {
    expect(parsePaymentDummyPackageIdSearchParam({})).toEqual({
      packageId: null,
      paymentError: "missing-package",
    });
  });

  it("maps invalid package ids to the route-level error contract", () => {
    expect(parsePaymentDummyPackageIdSearchParam({ packageId: "not-a-uuid" })).toEqual({
      packageId: null,
      paymentError: "invalid-package",
    });
  });
});

describe("consoleAssetDetailActionInputSchema", () => {
  it("accepts a valid asset id payload", () => {
    expect(consoleAssetDetailActionInputSchema.parse({ assetId: "22222222-2222-4222-8222-222222222222" })).toEqual({
      assetId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("accepts legacy non-uuid asset id payloads from the console snapshot", () => {
    expect(consoleAssetDetailActionInputSchema.parse({ assetId: "TV-001" })).toEqual({
      assetId: "TV-001",
    });
  });

  it("accepts canonical Postgres-style asset ids used by seeded asset rows", () => {
    expect(consoleAssetDetailActionInputSchema.parse({ assetId: "20000000-0000-0000-0000-000000000003" })).toEqual({
      assetId: "20000000-0000-0000-0000-000000000003",
    });
  });

  it("rejects an invalid asset id payload", () => {
    expect(() => consoleAssetDetailActionInputSchema.parse({ assetId: "  " })).toThrow("Asset ID is required.");
  });
});
