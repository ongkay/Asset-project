export type AuthEmailCheckStatus = "registered" | "unregistered";

export type AuthRedirectTarget = "/admin" | "/console" | "/login";

export type AuthFailureReason =
  | "auth_provider_error"
  | "email_already_registered"
  | "invalid_reset_token"
  | "profile_missing"
  | "sign_in_failed"
  | "user_banned"
  | "wrong_password";

export type AuthProviderUser = {
  email: string;
  emailVerified: boolean;
  id: string;
};

export type AuthEmailCheckResult = {
  normalizedEmail: string;
  status: AuthEmailCheckStatus;
};

export type AuthActionFailureResult = {
  failureReason?: AuthFailureReason;
  message: string;
  ok: false;
  requiresLogin?: boolean;
  showResetPasswordCta?: boolean;
};

export type AuthActionSuccessResult = {
  message?: string;
  ok: true;
  redirectTo: AuthRedirectTarget;
  requiresLogin?: boolean;
};

export type AuthActionResult = AuthActionFailureResult | AuthActionSuccessResult;

export type ResetFlowView = "invalid" | "request" | "request-sent" | "reset";

export type ResetLinkState = "idle" | "invalid" | "ready";

export type LoginLogWriteInput = {
  browser: string | null;
  email: string;
  failureReason: string | null;
  ipAddress: string;
  isSuccess: boolean;
  os: string | null;
  userId: string | null;
};

export type AuthProfile = {
  avatarUrl: string | null;
  email: string;
  isBanned: boolean;
  publicId: string;
  role: "admin" | "member";
  userId: string;
  username: string;
};

export type AuthenticatedUserSnapshot = {
  accessToken?: string;
  profile: AuthProfile | null;
  user: {
    email: string | null;
    id: string;
  } | null;
};
