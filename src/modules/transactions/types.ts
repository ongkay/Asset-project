export type ActivationSource = "payment_dummy" | "cdkey" | "admin_manual";

export type TransactionRecord = {
  amountRp: number;
  code: string;
  createdAt: string;
  id: string;
  packageId: string;
  packageName: string;
  source: ActivationSource;
  status: "pending" | "success" | "failed" | "canceled";
  subscriptionId: string | null;
  userId: string;
};

export type CreateTransactionInput = {
  amountRp: number;
  cdKeyId?: string;
  packageId: string;
  packageName: string;
  source: ActivationSource;
  status: TransactionRecord["status"];
  subscriptionId?: string;
  userId: string;
};
