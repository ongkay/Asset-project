import type { PackageAccessKey } from "@/modules/packages/types";

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

export type CdKeyCodeStatus = "manual" | "generated";

export type CdKeyIssueFormInput = {
  amountRpOverride: number | null;
  manualCode: string | null;
  packageId: string;
};

export type CdKeyIssueInput = {
  amountRpOverride: number | null;
  manualCode: string | null;
  packageId: string;
};

export type CreateCdKeyRowInput = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  code: string;
  createdBy: string;
  durationDays: number;
  isExtended: boolean;
  packageId: string;
};

export type CdKeyIssueRecord = {
  accessKeys: PackageAccessKey[];
  amountRp: number;
  code: string;
  createdBy: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  isExtended: boolean;
  packageId: string;
  usedAt: string | null;
  usedBy: string | null;
};

export type MapCdKeyIssueRecordPayload = {
  access_keys_json: PackageAccessKey[];
  amount_rp: number;
  code: string;
  created_by: string;
  duration_days: number;
  id: string;
  is_active: boolean;
  is_extended: boolean;
  package_id: string;
  used_at: string | null;
  used_by: string | null;
};

export type CdKeyIssueResult =
  | {
      ok: true;
      row: CdKeyIssueRecord;
    }
  | {
      message: string;
      ok: false;
    };

export const CD_KEY_ISSUE_EXAMPLE_FORM_INPUT: CdKeyIssueFormInput = {
  amountRpOverride: null,
  manualCode: "AB12CD34",
  packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
};

export const CD_KEY_ISSUE_EXAMPLE_INPUT: CdKeyIssueInput = {
  amountRpOverride: 150000,
  manualCode: null,
  packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
};
