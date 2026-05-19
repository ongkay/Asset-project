export type ExtPlatform = "tradingview" | "fxtester";
export type ExtMode = "private" | "share";

export type ExtVersionStatus =
  | { status: "supported" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_available" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_required" };

export type ExtAssetSummary = {
  launchUrl?: string | null;
  mode: ExtMode;
  nextMode?: "private";
  platform: ExtPlatform;
};

export type ExtAssetCookieValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: ExtAssetCookieValue }
  | ExtAssetCookieValue[];

export type ExtAssetCookie = Record<string, ExtAssetCookieValue | undefined>;

export type ExtRuntimeAssetSnapshot = {
  assetId: string;
  cookies: ExtAssetCookie[];
  launchUrl: string | null;
  proxy: string | null;
  updatedAt: string;
};

export type ExtTradingViewOwnedLayout = {
  chartId: string;
  title: string;
  updatedAt: string;
  url: string;
};

export type ExtTradingViewOwnedLayoutSnapshot = {
  lastOpenedAt: string | null;
  lastOpenedChartId: string | null;
  layouts: ExtTradingViewOwnedLayout[];
};
