import type { AssetJsonArray, AssetJsonObject, AssetStatus, AssetType } from "@/modules/assets/types";

export type AssetTableFilters = {
  search: string | null;
  assetType: AssetType | null;
  status: AssetStatus | null;
  expiresFrom: string | null;
  expiresTo: string | null;
  page: number;
  pageSize: number;
};

export type AssetAdminRow = {
  id: string;
  platform: "tradingview" | "fxreplay" | "fxtester";
  assetType: AssetType;
  note: string | null;
  expiresAt: string;
  disabledAt: string | null;
  status: AssetStatus;
  totalUsed: number;
  createdAt: string;
  updatedAt: string;
};

export type AssetActiveUserRow = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  accessKey?: string;
  subscriptionId?: string;
  subscriptionStatus?: "active" | "processed" | "expired" | "canceled";
  assignedAt?: string;
};

export type AssetEditorData = {
  id: string;
  platform: "tradingview" | "fxreplay" | "fxtester";
  assetType: AssetType;
  account: string;
  note: string | null;
  proxy: string | null;
  assetJson: AssetJsonObject | AssetJsonArray;
  expiresAt: string;
  disabledAt: string | null;
  status: AssetStatus;
  totalUsed: number;
  createdAt: string;
  updatedAt: string;
  activeUsers: AssetActiveUserRow[];
};

export type AssetTableResult = {
  items: AssetAdminRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};
