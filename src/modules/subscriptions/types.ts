import type { AssetJsonArray, AssetJsonObject, AssetPlatform, AssetType } from "@/modules/assets/types";

export type SubscriptionStatus = "active" | "processed" | "expired" | "canceled";
export type SubscriptionSource = "payment_dummy" | "cdkey" | "admin_manual";

export type ManualAssignmentsByAccessKey = Record<string, string | null>;

export type AdminManualActivationFormValues = {
  userId: string;
  packageId: string;
  durationDays: number;
  manualAssignmentsByAccessKey: ManualAssignmentsByAccessKey;
};

export type SubscriptionPackageSnapshot = {
  packageId: string;
  name: string;
  amountRp: number;
  durationDays: number;
  isExtended: boolean;
  accessKeys: string[];
  isActive?: boolean;
};

export type AdminManualActivationInput = {
  userId: string;
  packageSnapshot: SubscriptionPackageSnapshot;
  durationDays: number;
  manualAssignmentsByAccessKey: ManualAssignmentsByAccessKey;
  existingRunningSubscriptionId: string | null;
};

export type SubscriberQuickAddAssetValues = {
  userId: string;
  packageId: string;
  subscriptionId: string | null;
  platform: AssetPlatform;
  account: string;
  durationDays: number;
  note: string | null;
  proxy: string | null;
  assetJsonText: string;
};

export type SubscriberQuickAddAssetInput = {
  userId: string;
  packageId: string;
  subscriptionId: string | null;
  accessKey: string;
  platform: AssetPlatform;
  assetType: AssetType;
  account: string;
  note: string | null;
  proxy: string | null;
  assetJson: AssetJsonObject | AssetJsonArray;
  expiresAt: string;
};

export type SubscriberCancelInput = {
  subscriptionId: string;
};

export type SubscriptionRow = {
  id: string;
  userId: string;
  packageId: string;
  packageName: string;
  accessKeys: string[];
  status: SubscriptionStatus;
  source: SubscriptionSource;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionAssignmentRow = {
  id: string;
  accessKey: string;
  assetId: string | null;
};

export type TransactionCreateInput = {
  code: string;
  userId: string;
  subscriptionId: string;
  packageId: string;
  packageName: string;
  source: SubscriptionSource;
  status: "success";
  amountRp: number;
  paidAt: string;
};

export type TransactionRow = {
  id: string;
  code: string;
};

export type SubscriptionActivationMode =
  | "create-new"
  | "extend-existing"
  | "replace-with-carry-over"
  | "replace-immediately";

export type SubscriptionActivationResult = {
  subscriptionId: string;
  transactionId: string;
  mode: SubscriptionActivationMode;
};
