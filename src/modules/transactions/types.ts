export type ActivationSource = "payment_dummy" | "cdkey" | "admin_manual";
export type TransactionStatus = "pending" | "success" | "failed" | "canceled";

export type TransactionRecord = {
  amountRp: number;
  code: string;
  createdAt: string;
  failureReason: string | null;
  id: string;
  packageId: string;
  packageName: string;
  paidAt: string | null;
  source: ActivationSource;
  status: TransactionStatus;
  subscriptionId: string | null;
  userId: string;
};

export type CreateTransactionInput = {
  amountRp: number;
  cdKeyId?: string;
  packageId: string;
  packageName: string;
  source: ActivationSource;
  subscriptionId?: string;
  userId: string;
};

export type FinalizeTransactionFailureInput = {
  failureReason: string;
  transactionId: string;
};
