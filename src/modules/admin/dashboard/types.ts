export type AdminDashboardPreset = "30d" | "90d" | "custom";

export type AdminDashboardFilters = {
  preset: AdminDashboardPreset;
  from: string | null;
  to: string | null;
};

export type AdminDashboardResolvedRange = {
  preset: AdminDashboardPreset;
  from: string;
  to: string;
  fromIso: string;
  toIso: string;
  label: string;
};

export type AdminDashboardStats = {
  from: string;
  to: string;
  totalAssets: number;
  totalMembers: number;
  totalMixedSubscriptions: number;
  totalPrivateSubscriptions: number;
  totalShareSubscriptions: number;
  totalSubscribedMembers: number;
  totalSuccessAmountRp: number;
};

export type AdminDashboardSummary = {
  totalMembers: number;
  totalSubscribedMembers: number;
  totalAssets: number;
  totalSuccessAmountRp: number;
};

export type AdminDashboardSeriesPoint = {
  bucketKey: string;
  bucketLabel: string;
};

export type AdminDashboardRecentUserRow = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: "member";
  activePackageName: string | null;
  lastSeenAt: string;
};

export type AdminDashboardSnapshot = {
  summary: AdminDashboardSummary;
  salesSeries: Array<AdminDashboardSeriesPoint & { amountRp: number }>;
  memberGrowthSeries: Array<AdminDashboardSeriesPoint & { newMembers: number; subscribedMembers: number }>;
  transactionSeries: Array<AdminDashboardSeriesPoint & { successCount: number }>;
  subscriptionComposition: {
    private: number;
    share: number;
    mixed: number;
  };
  recentUsers: AdminDashboardRecentUserRow[];
  range: AdminDashboardResolvedRange;
};
