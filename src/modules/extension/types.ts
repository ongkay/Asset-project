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
  extensionId: string;
  extensionVersion: string;
  os: string | null;
};

export type ExtensionTrackHeartbeatWriteInput = ExtensionTrackHeartbeatInput & {
  sessionId: string;
  userId: string;
};

export type ExtensionTrackHeartbeatRecord = {
  firstSeenAt: string;
  id: string;
  lastSeenAt: string;
};
