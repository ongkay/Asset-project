export type SessionToken = string;

export type SessionTokenHash = string;

export type SessionLookupResult = {
  sessionId: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export type SessionWriteMetadata = {
  userId: string;
  tokenHash: SessionTokenHash;
};

export type SessionCookieContract = {
  cookieName: "app_session";
  tokenFormat: "opaque";
  persistence: "http_only_cookie";
};

export const SESSION_COOKIE_CONTRACT: SessionCookieContract = {
  cookieName: "app_session",
  tokenFormat: "opaque",
  persistence: "http_only_cookie",
};

export type SessionNoncePayload = {
  expiresAt: string;
  sessionId: string;
  userId: string;
};
