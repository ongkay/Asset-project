export type ExtPlatform = "tradingview" | "fxreplay" | "fxtester";

export type ExtVersionStatus =
  | { status: "supported" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_available" }
  | { downloadUrl: string; latestVersion: string; minimumVersion: string; status: "update_required" };

export type ExtPlatformAccessSummary = {
  hasPrivateAccess: boolean;
  hasShareAccess: boolean;
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
