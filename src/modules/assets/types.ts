export const ASSET_PLATFORMS = ["tradingview", "fxreplay", "fxtester"] as const;
export const ASSET_TYPES = ["private", "share"] as const;
export const ASSET_STATUSES = ["available", "assigned", "expired", "disabled"] as const;

export type AssetPlatform = (typeof ASSET_PLATFORMS)[number];
export type AssetType = (typeof ASSET_TYPES)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetJsonPrimitive = string | number | boolean | null;
export type AssetJsonObject = {
  [key: string]: AssetJsonValue;
};
export type AssetJsonArray = AssetJsonValue[];
export type AssetJsonValue = AssetJsonPrimitive | AssetJsonObject | AssetJsonArray;

export type AssetRow = {
  id: string;
  platform: AssetPlatform;
  assetType: AssetType;
  account: string;
  note: string | null;
  proxy: string | null;
  assetJson: AssetJsonObject | AssetJsonArray;
  expiresAt: string;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetFormValues = {
  platform: AssetPlatform;
  assetType: AssetType;
  account: string;
  note: string | null;
  proxy: string | null;
  assetJsonText: string;
  expiresAt: string;
};

export type AssetFormInput = {
  platform: AssetPlatform;
  assetType: AssetType;
  account: string;
  note: string | null;
  proxy: string | null;
  assetJson: AssetJsonObject | AssetJsonArray;
  expiresAt: string;
};

export type AssetToggleInput = {
  id: string;
  disabled: boolean;
};

export type AssetDeleteInput = {
  id: string;
};

export type AssetUsageSummary = {
  totalUsed: number;
};

export type AssetStatusRow = {
  id: string;
  platform: AssetPlatform;
  assetType: AssetType;
  expiresAt: string;
  disabledAt: string | null;
  totalUsed: number;
  status: AssetStatus;
};

export type AssetActiveAssignmentRow = {
  id: string;
  subscriptionId: string;
  userId: string;
  assetId: string;
  accessKey: string;
  assignedAt: string;
};

export type AssetProfileRow = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
};

export type AssetSubscriptionRow = {
  id: string;
  status: "active" | "processed" | "expired" | "canceled";
};
