import type { AssetPlatform, AssetType } from "@/modules/assets/types";
import type { ActivationSource, TransactionStatus } from "@/modules/transactions/types";

export type AdminUserLogsActiveTab = "login" | "extension" | "transactions";

export type AdminLoginHistoryFilters = {
  search: string | null;
  os: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
};

export type AdminExtensionTrackFilters = {
  search: string | null;
  browser: string | null;
  os: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
};

export type AdminTransactionsFilters = {
  search: string | null;
  source: ActivationSource | null;
  status: TransactionStatus | null;
  dateFrom: string | null;
  dateTo: string | null;
  page: number;
  pageSize: number;
};

export type AdminUserLogsRouteState = {
  tab: AdminUserLogsActiveTab;
  login: AdminLoginHistoryFilters;
  extension: AdminExtensionTrackFilters;
  transactions: AdminTransactionsFilters;
};

export type AdminLoginHistoryRowUser = {
  userId: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  publicId: string | null;
  isResolved: boolean;
};

export type AdminLoginHistoryRow = {
  loginLogId: string;
  user: AdminLoginHistoryRowUser;
  ipAddress: string;
  browser: string | null;
  os: string | null;
  loginTime: string;
  isSuccess: boolean;
  failureReason: string | null;
};

export type AdminLoginHistoryPage = {
  items: AdminLoginHistoryRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  availableOsValues: string[];
};

export type AdminExtensionTrackRowUser = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  publicId: string;
};

export type AdminExtensionTrackRow = {
  extensionTrackId: string;
  user: AdminExtensionTrackRowUser;
  ipAddress: string;
  city: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
  extensionVersion: string;
  deviceId: string;
  extensionId: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AdminExtensionTrackPage = {
  items: AdminExtensionTrackRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  availableBrowsers: string[];
  availableOsValues: string[];
};

export type AdminTransactionRowUser = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  publicId: string;
};

export type AdminTransactionRow = {
  transactionId: string;
  subscriptionId: string | null;
  user: AdminTransactionRowUser;
  packageId: string;
  packageName: string;
  source: ActivationSource;
  status: TransactionStatus;
  amountRp: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export type AdminTransactionRevenueSummary = {
  successCount: number;
  successAmountRp: number;
};

export type AdminTransactionsPage = {
  items: AdminTransactionRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  revenueSummary: AdminTransactionRevenueSummary;
};

export type AdminAssignmentSnapshotRow = {
  assignmentId: string;
  subscriptionId: string;
  assetId: string | null;
  originalAssetId: string;
  accessKey: string;
  platform: AssetPlatform;
  assetType: AssetType;
  assetNote: string | null;
  assetExpiresAt: string;
  assignedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  assetDeletedAt: string | null;
};

export type AdminTransactionDetail = {
  transactionId: string;
  subscriptionId: string | null;
  user: AdminTransactionRowUser;
  packageName: string;
  source: ActivationSource;
  status: TransactionStatus;
  amountRp: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  assignmentHistory: AdminAssignmentSnapshotRow[];
};
