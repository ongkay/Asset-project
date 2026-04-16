import type { AssetPlatform, AssetType } from "@/modules/assets/types";
import type { SubscriptionPackageSnapshot, SubscriptionStatus } from "@/modules/subscriptions/types";

export type SubscriberTableFilters = {
  search: string | null;
  assetType: AssetType | null;
  status: SubscriptionStatus | null;
  expiresFrom: string | null;
  expiresTo: string | null;
  page: number;
  pageSize: number;
};

export type SubscriberAdminRow = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  subscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  startAt: string;
  expiresAt: string;
  packageId: string;
  packageName: string;
  accessKeys: string[];
  totalSpentRp: number;
  selectedSubscriptionUpdatedAt: string;
};

export type SubscriberTableResult = {
  items: SubscriberAdminRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type SubscriberUserOption = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  currentSubscriptionId: string | null;
  currentSubscriptionStatus: SubscriptionStatus | null;
};

export type SubscriberPackageOption = SubscriptionPackageSnapshot & {
  packageSummary?: "private" | "share" | "mixed";
};

export type SubscriberCurrentAssignment = {
  accessKey: string;
  assetId: string;
  platform: AssetPlatform;
  assetType: AssetType;
  note: string | null;
  expiresAt: string;
  assignmentId: string;
};

export type SubscriberCandidateAsset = {
  assetId: string;
  platform: AssetPlatform;
  assetType: AssetType;
  note: string | null;
  expiresAt: string;
  status: "available" | "assigned" | "expired" | "disabled";
  totalUsed: number;
  isCurrentSelection: boolean;
};

export type SubscriberCandidateGroup = {
  accessKey: string;
  assetType: AssetType;
  platform: AssetPlatform;
  currentSelection: SubscriberCurrentAssignment | null;
  candidates: SubscriberCandidateAsset[];
  isFulfilled: boolean;
  canQuickAddPrivateAsset: boolean;
};

export type SubscriberEditorData = {
  selectedUser: SubscriberUserOption | null;
  selectedSubscription: SubscriberAdminRow | null;
  packageOptions: SubscriberPackageOption[];
  defaultPackageId: string | null;
  defaultDurationDays: number | null;
  currentAssignments: SubscriberCurrentAssignment[];
};

export type SubscriberActivationDraft = {
  userId: string;
  packageId: string;
  subscriptionId: string | null;
  packageSnapshot: Omit<SubscriptionPackageSnapshot, "isActive">;
  defaultDurationDays: number;
  candidateGroups: SubscriberCandidateGroup[];
};

export type SubscriberTableSourceRow = {
  subscriptionId: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  packageId: string;
  packageName: string;
  accessKeys: string[];
  status: SubscriptionStatus;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  isRunning: boolean;
};
