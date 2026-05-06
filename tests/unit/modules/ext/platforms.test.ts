import { describe, expect, it } from "vitest";

import { EXT_PLATFORMS, EXTENSION_V2_KEY } from "@/modules/ext/platforms";

describe("ext platforms", () => {
  it("exports the extension v2 key", () => {
    expect(EXTENSION_V2_KEY).toBe("asset-extension-v2");
  });

  it("exports the supported platform registry", () => {
    expect(EXT_PLATFORMS).toEqual({
      tradingview: {
        allowedHosts: ["www.tradingview.com", "tradingview.com"],
        cookieDomains: [".tradingview.com"],
        platform: "tradingview",
      },
      fxtester: {
        allowedHosts: ["app.forextester.com", "forextester.com"],
        cookieDomains: [".forextester.com"],
        platform: "fxtester",
      },
    });
  });
});
