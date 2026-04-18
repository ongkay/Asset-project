import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";

import type {
  CdKeyActivationSnapshot,
  CdKeyIssueRecord,
  CreateCdKeyRowInput,
  MapCdKeyIssueRecordPayload,
} from "./types";

type CdKeyRow = {
  access_keys_json: string[];
  amount_rp: number;
  code: string;
  duration_days: number;
  id: string;
  is_active: boolean;
  is_extended: boolean;
  package: {
    name: string;
  } | null;
  package_id: string;
  used_at: string | null;
  used_by: string | null;
};

function mapCdKeyIssueRecord(row: MapCdKeyIssueRecordPayload): CdKeyIssueRecord {
  return {
    accessKeys: row.access_keys_json,
    amountRp: row.amount_rp,
    code: row.code,
    createdBy: row.created_by,
    durationDays: row.duration_days,
    id: row.id,
    isActive: row.is_active,
    isExtended: row.is_extended,
    packageId: row.package_id,
    usedAt: row.used_at,
    usedBy: row.used_by,
  };
}

export async function findCdKeyByCode(code: string): Promise<CdKeyActivationSnapshot | null> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("cd_keys")
    .select(
      "id, code, package_id, duration_days, is_extended, access_keys_json, amount_rp, is_active, used_by, used_at, package:packages(name)",
    )
    .eq("code", code)
    .maybeSingle<CdKeyRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    accessKeys: data.access_keys_json,
    amountRp: data.amount_rp,
    code: data.code,
    durationDays: data.duration_days,
    id: data.id,
    isActive: data.is_active,
    isExtended: data.is_extended,
    packageName: data.package?.name ?? data.code,
    packageId: data.package_id,
    usedAt: data.used_at,
    usedBy: data.used_by,
  };
}

export async function reserveCdKeyUsage(cdKeyId: string, userId: string): Promise<string | null> {
  const database = createInsForgeAdminDatabase();
  const reservedAt = new Date().toISOString();
  const { data, error } = await database
    .from("cd_keys")
    .update({ used_at: reservedAt, used_by: userId })
    .eq("id", cdKeyId)
    .is("used_at", null)
    .select("used_at")
    .maybeSingle<{ used_at: string }>();

  if (error) {
    throw error;
  }

  return data?.used_at ?? null;
}

export async function releaseReservedCdKeyUsage(input: {
  cdKeyId: string;
  reservedAt: string;
  userId: string;
}): Promise<void> {
  const database = createInsForgeAdminDatabase();
  const { error } = await database
    .from("cd_keys")
    .update({ used_at: null, used_by: null })
    .eq("id", input.cdKeyId)
    .eq("used_by", input.userId)
    .eq("used_at", input.reservedAt);

  if (error) {
    throw error;
  }
}

export async function createCdKeyRow(input: CreateCdKeyRowInput): Promise<CdKeyIssueRecord> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("cd_keys")
    .insert([
      {
        code: input.code,
        package_id: input.packageId,
        duration_days: input.durationDays,
        is_extended: input.isExtended,
        access_keys_json: input.accessKeys,
        amount_rp: input.amountRp,
        created_by: input.createdBy,
        used_by: null,
        used_at: null,
        is_active: true,
      },
    ])
    .select(
      "id, code, package_id, duration_days, is_extended, access_keys_json, amount_rp, is_active, used_by, used_at, created_by",
    )
    .single<MapCdKeyIssueRecordPayload>();

  if (error) {
    throw error;
  }

  return mapCdKeyIssueRecord(data);
}
