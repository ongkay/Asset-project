import type { ActivationSource, TransactionRecord } from "@/modules/transactions/types";

export type PackageActivationSnapshot = {
  accessKeys: string[];
  amountRp: number;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  name: string;
};

export type RunningSubscription = {
  accessKeys: string[];
  endAt: string;
  id: string;
  packageId: string;
  packageName: string;
  startAt: string;
  status: "active" | "processed";
  userId: string;
};

export type ActivationSnapshot = {
  accessKeys: string[];
  amountRp: number;
  durationDays: number;
  isExtended: boolean;
  packageId: string;
  packageName: string;
};

export type ActivateSubscriptionInput = {
  activatedAt?: Date;
  amountOverrideRp?: number;
  cancelReason?: string;
  cdKeyCode?: string;
  packageId?: string;
  source: ActivationSource;
  userId: string;
};

export type ActivationResult = {
  nextRunningSubscriptionId: string;
  previousRunningSubscriptionId: string | null;
  subscriptionStatus: "active" | "processed" | "expired" | "canceled";
  transaction: TransactionRecord;
};
