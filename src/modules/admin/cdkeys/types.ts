import type { PackageAccessKey, PackageSummary } from "@/modules/packages/types";

export type CdKeyUsageStatus = "used" | "unused";

export type CdKeyTableFilters = {
  search: string | null;
  status: CdKeyUsageStatus | null;
  packageId: string | null;
  packageSummary: PackageSummary | null;
  page: number;
  pageSize: number;
};

export type CdKeyUserIdentity = {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
};

export type CdKeyAdminRow = {
  id: string;
  code: string;
  packageId: string;
  packageName: string | null;
  packageSummary: PackageSummary;
  status: CdKeyUsageStatus;
  isActive: boolean;
  usedBy: CdKeyUserIdentity | null;
  createdBy: CdKeyUserIdentity;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CdKeyTablePackageOption = {
  packageId: string;
  packageName: string | null;
  isActive: boolean | null;
};

export type CdKeyTableResult = {
  items: CdKeyAdminRow[];
  packageOptions: CdKeyTablePackageOption[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type CdKeyPackageOption = {
  packageId: string;
  name: string;
  amountRp: number;
  durationDays: number;
  isExtended: boolean;
  accessKeys: PackageAccessKey[];
  packageSummary: PackageSummary;
};

export type CdKeyDetailSnapshot = {
  id: string;
  code: string;
  packageId: string;
  packageName: string | null;
  packageSummary: PackageSummary;
  amountRp: number;
  durationDays: number;
  isExtended: boolean;
  accessKeys: PackageAccessKey[];
  isActive: boolean;
  createdBy: CdKeyUserIdentity;
  usedBy: CdKeyUserIdentity | null;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
