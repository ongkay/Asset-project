export type ExtensionRuntimeConfig = {
  allowedIds: string[];
  allowedOrigins: string[];
  trustedProxyHeaders: {
    city: string;
    country: string;
    ip: string;
  };
};

export type ExtensionNetworkMetadata = {
  city: string | null;
  country: string | null;
  ipAddress: string;
};

export type ExtensionRequestHeaders = {
  extensionId: string;
  origin: string;
};

export type ExtensionTrackHeartbeatInput = {
  browser: string | null;
  deviceId: string;
  extensionVersion: string;
  os: string | null;
};

export type ExtensionTrackHeartbeatWriteInput = ExtensionTrackHeartbeatInput & {
  extensionId: string;
  sessionId: string;
  userId: string;
};

export type ExtensionSessionAccessStatus = "active" | "processed";

export type ExtensionSessionStatus = ExtensionSessionAccessStatus | "expired" | "canceled" | "none";

export type ExtensionSessionSnapshot = {
  assets: Array<{
    accessKey: string;
    assetType: "private" | "share";
    expiresAt: string;
    id: string;
    platform: "tradingview" | "fxreplay" | "fxtester";
  }>;
  subscription: {
    daysLeft: number;
    endAt: string;
    id: string;
    packageId: string;
    packageName: string;
    startAt: string;
    status: ExtensionSessionAccessStatus;
  } | null;
};

export type ExtensionSessionResponse = {
  requestNonce?: {
    expiresAt: string;
    value: string;
  };
  subscription: {
    assets: ExtensionSessionSnapshot["assets"];
    daysLeft: number;
    endAt: string | null;
    packageName: string | null;
    status: ExtensionSessionStatus;
  };
  user: {
    email: string;
    id: string;
    publicId: string;
    username: string;
  };
};

export type ExtensionAssetDetail = {
  accessKey: string;
  account: string;
  asset: unknown;
  assetType: "private" | "share";
  expiresAt: string;
  id: string;
  note: string | null;
  platform: "tradingview" | "fxreplay" | "fxtester";
  proxy: string | null;
  subscriptionId: string;
};

export type ExtensionTrackHeartbeatRecord = {
  firstSeenAt: string;
  id: string;
  lastSeenAt: string;
};
