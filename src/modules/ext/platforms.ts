export const EXTENSION_V2_KEY = "asset-extension-v2";

export const EXT_PLATFORMS = {
  tradingview: {
    allowedHosts: ["www.tradingview.com", "tradingview.com"],
    cookieDomains: [".tradingview.com"],
    platform: "tradingview",
  },
  fxreplay: {
    allowedHosts: ["app.fxreplay.com", "fxreplay.com"],
    cookieDomains: [".fxreplay.com"],
    platform: "fxreplay",
  },
  fxtester: {
    allowedHosts: ["app.forextester.com", "forextester.com"],
    cookieDomains: [".forextester.com"],
    platform: "fxtester",
  },
} as const;
