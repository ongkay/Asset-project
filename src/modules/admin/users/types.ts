import type { AssetPlatform, AssetType } from "@/modules/assets/types";
import type { PackageSummary } from "@/modules/packages/types";
import type { SubscriptionStatus } from "@/modules/subscriptions/types";
import type { ActivationSource, TransactionRecord } from "@/modules/transactions/types";

export type AdminUsersTableFilters = {
  search: string | null;
  role: "admin" | "member" | null;
  subscriptionStatus: SubscriptionStatus | null;
  packageSummary: PackageSummary | "none" | null;
  page: number;
  pageSize: number;
};

export type AdminUserRow = {
  userId: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  publicId: string;
  role: "admin" | "member";
  isBanned: boolean;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionEndAt: string | null;
  activePackageSummary: PackageSummary | "none";
  createdAt: string;
  updatedAt: string;
};

export type AdminUsersTableResult = {
  items: AdminUserRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type AdminUserDetailProfile = {
  userId: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  publicId: string;
  role: "admin" | "member";
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserDetailSubscription = {
  subscriptionId: string | null;
  packageId: string | null;
  packageName: string | null;
  status: SubscriptionStatus | null;
  startAt: string | null;
  endAt: string | null;
  packageSummary: PackageSummary | "none";
};

export type AdminUserDetailActiveAsset = {
  assetId: string;
  subscriptionId: string;
  accessKey: string;
  platform: AssetPlatform;
  assetType: AssetType;
  note: string | null;
  expiresAt: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndAt: string;
};

export type AdminUserDetailTransaction = {
  transactionId: string;
  packageId: string;
  packageName: string;
  source: ActivationSource;
  status: TransactionRecord["status"];
  amountRp: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export type AdminUserDetailLoginLog = {
  loginLogId: string;
  userId: string | null;
  email: string;
  isSuccess: boolean;
  failureReason: string | null;
  ipAddress: string;
  browser: string | null;
  os: string | null;
  createdAt: string;
};

export type AdminUserDetailExtensionTrack = {
  extensionTrackId: string;
  extensionId: string;
  deviceId: string;
  extensionVersion: string;
  ipAddress: string;
  city: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AdminUserDetailPayload = {
  profile: AdminUserDetailProfile;
  currentSubscription: AdminUserDetailSubscription;
  activeAssets: AdminUserDetailActiveAsset[];
  transactions: AdminUserDetailTransaction[];
  loginLogs: AdminUserDetailLoginLog[];
  extensionTracks: AdminUserDetailExtensionTrack[];
};
