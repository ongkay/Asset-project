import "server-only";

export type ExtensionApiErrorCode =
  | "EXT_ORIGIN_DENIED"
  | "EXT_HEADER_REQUIRED"
  | "NONCE_REQUIRED"
  | "NONCE_INVALID"
  | "SESSION_MISSING"
  | "SESSION_REVOKED"
  | "USER_BANNED"
  | "SUBSCRIPTION_EXPIRED"
  | "ASSET_NOT_ALLOWED"
  | "NOT_FOUND";

const EXTENSION_API_STATUS_BY_CODE: Record<ExtensionApiErrorCode, number> = {
  EXT_HEADER_REQUIRED: 400,
  NONCE_REQUIRED: 400,
  NONCE_INVALID: 400,
  SESSION_MISSING: 401,
  SESSION_REVOKED: 401,
  EXT_ORIGIN_DENIED: 403,
  USER_BANNED: 403,
  SUBSCRIPTION_EXPIRED: 403,
  ASSET_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
};

export class ExtensionApiError extends Error {
  constructor(
    public readonly code: ExtensionApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtensionApiError";
  }
}

export function buildExtensionApiErrorResponse(error: unknown): Response {
  if (error instanceof ExtensionApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: EXTENSION_API_STATUS_BY_CODE[error.code] },
    );
  }

  throw error;
}
