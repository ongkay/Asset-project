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

export type ExtAssetCookie = {
  domain: string;
  expirationDate?: number;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: "lax" | "no_restriction" | "strict" | "unspecified";
  secure: boolean;
  value: string;
};
