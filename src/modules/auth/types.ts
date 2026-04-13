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
