export type ExtPlatform = "tradingview" | "fxtester";
export type ExtMode = "private" | "share";

export type ExtVersionStatus =
  | { status: "supported" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_available" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_required" };

export type ExtAssetSummary = {
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
  proxy: string | null;
  updatedAt: string;
};
