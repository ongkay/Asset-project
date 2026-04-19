export type ConsoleSubscriptionSnapshot = {
  daysLeft: number;
  endAt: string;
  id: string;
  packageId: string;
  packageName: string;
  startAt: string;
  status: "active" | "processed";
};

export type ConsoleAssetSnapshot = {
  accessKey: string;
  assetType: "private" | "share";
  assignmentId: string;
  expiresAt: string;
  id: string;
  note: string | null;
  platform: "tradingview" | "fxreplay" | "fxtester";
  proxy: string | null;
  subscriptionId: string;
};

export type ConsoleTransactionSnapshot = {
  amountRp: number;
  createdAt: string;
  id: string;
  packageId: string;
  packageName: string;
  paidAt: string | null;
  source: "payment_dummy" | "cdkey" | "admin_manual";
  status: "pending" | "success" | "failed" | "canceled";
};

export type ConsoleSnapshot = {
  assets: ConsoleAssetSnapshot[];
  subscription: ConsoleSubscriptionSnapshot | null;
  transactions: ConsoleTransactionSnapshot[];
};

export type ConsoleState = "active" | "processed" | "expired" | "canceled" | "none";

export type ConsoleStateLatestSubscription = {
  endAt: string;
  id: string;
  packageId: string;
  packageName: string;
  startAt: string;
  status: Exclude<ConsoleState, "none">;
};

export type ConsoleStateSnapshot = {
  latestSubscription: ConsoleStateLatestSubscription | null;
  state: ConsoleState;
};

export type ConsolePaymentError = "missing-package" | "invalid-package" | "disabled-package";

export type PaymentDummyPackageSearchParamResult = {
  packageId: string | null;
  paymentError: Exclude<ConsolePaymentError, "disabled-package"> | null;
};

export type ConsoleAssetDetail = {
  accessKey: string;
  account: string;
  asset: unknown;
  assetType: "private" | "share";
  expiresAt: string;
  id: string;
  note: string | null;
  platform: "tradingview" | "fxreplay" | "fxtester";
  proxy: string | null;
  subscriptionId: string;
};
