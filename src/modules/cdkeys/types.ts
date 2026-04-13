export type CdKeyActivationSnapshot = {
  accessKeys: string[];
  amountRp: number;
  code: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  packageName: string;
  packageId: string;
  usedAt: string | null;
  usedBy: string | null;
};
