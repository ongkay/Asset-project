import "server-only";

export type ExtApiErrorCode =
  | "EXT_HEADER_REQUIRED"
  | "EXT_ORIGIN_DENIED"
  | "EXT_REQUEST_INVALID"
  | "EXT_UNAUTHENTICATED"
  | "EXT_SESSION_REVOKED"
  | "EXT_USER_BANNED"
  | "EXT_UPDATE_REQUIRED"
  | "EXT_SUBSCRIPTION_REQUIRED"
  | "EXT_PLATFORM_UNSUPPORTED"
  | "EXT_MODE_REQUIRED"
  | "EXT_MODE_NOT_ALLOWED"
  | "EXT_ASSET_UNAVAILABLE"
  | "EXT_REDEEM_INVALID"
  | "EXT_REDEEM_USED";

const EXT_API_STATUS_BY_CODE: Record<ExtApiErrorCode, number> = {
  EXT_HEADER_REQUIRED: 400,
  EXT_REQUEST_INVALID: 400,
  EXT_MODE_REQUIRED: 400,
  EXT_UNAUTHENTICATED: 401,
  EXT_SESSION_REVOKED: 401,
  EXT_ORIGIN_DENIED: 403,
  EXT_USER_BANNED: 403,
  EXT_UPDATE_REQUIRED: 403,
  EXT_SUBSCRIPTION_REQUIRED: 403,
  EXT_PLATFORM_UNSUPPORTED: 403,
  EXT_MODE_NOT_ALLOWED: 403,
  EXT_ASSET_UNAVAILABLE: 503,
  EXT_REDEEM_INVALID: 400,
  EXT_REDEEM_USED: 409,
};

export class ExtApiError extends Error {
  constructor(
    public readonly code: ExtApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtApiError";
  }
}

export function buildExtApiErrorResponse(error: unknown): Response {
  if (error instanceof ExtApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: EXT_API_STATUS_BY_CODE[error.code] },
    );
  }

  throw error;
}
