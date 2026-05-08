import { describe, expect, it } from "vitest";

import {
  extAssetQuerySchema,
  extAssetSyncQuerySchema,
  extBootstrapQuerySchema,
  extHeartbeatBodySchema,
  extRedeemBodySchema,
  extRequestHeadersSchema,
} from "@/modules/ext/schemas";

describe("ext schemas", () => {
  it("accepts asset query without mode for mixed-platform discovery", () => {
    expect(extAssetQuerySchema.parse({ platform: "tradingview" })).toEqual({
      platform: "tradingview",
    });
  });

  it("accepts asset sync query with optional blank revision", () => {
    expect(extAssetSyncQuerySchema.parse({ platform: "tradingview", revision: "  " })).toEqual({
      platform: "tradingview",
      revision: "",
    });
  });

  it("accepts heartbeat body with device id and extension version", () => {
    expect(extHeartbeatBodySchema.parse({ deviceId: "device-1", extensionVersion: "2.0.0" })).toEqual({
      deviceId: "device-1",
      extensionVersion: "2.0.0",
    });
  });

  it("accepts bootstrap query version when provided", () => {
    expect(extBootstrapQuerySchema.parse({ version: " 2.0.0 " })).toEqual({ version: "2.0.0" });
  });

  it("rejects malformed bootstrap query versions", () => {
    expect(() => extBootstrapQuerySchema.parse({ version: "2.bad.0" })).toThrow();
  });

  it("requires raw extension id plus trusted origin", () => {
    expect(
      extRequestHeadersSchema.parse({
        extensionId: "allowed-id",
        extensionVersion: "2.0.0",
        origin: "chrome-extension://allowed-id",
      }),
    ).toMatchObject({
      extensionId: "allowed-id",
      extensionVersion: "2.0.0",
      origin: "chrome-extension://allowed-id",
    });
  });

  it("rejects malformed extension versions in request headers", () => {
    expect(() =>
      extRequestHeadersSchema.parse({
        extensionId: "allowed-id",
        extensionVersion: "2.bad.0",
        origin: "chrome-extension://allowed-id",
      }),
    ).toThrow();
  });

  it("rejects malformed origins before allowlist checks", () => {
    expect(() =>
      extRequestHeadersSchema.parse({
        extensionId: "allowed-id",
        origin: "not-an-origin",
      }),
    ).toThrow();
  });

  it("rejects extension ids that look like urls", () => {
    expect(() =>
      extRequestHeadersSchema.parse({
        extensionId: "chrome-extension://allowed-id",
        origin: "chrome-extension://allowed-id",
      }),
    ).toThrow();
  });

  it("trims redeem request codes", () => {
    expect(extRedeemBodySchema.parse({ code: "  ABCD123456  " })).toEqual({ code: "ABCD123456" });
  });
});
