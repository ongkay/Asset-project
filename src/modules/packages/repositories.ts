import "server-only";

import { z } from "zod";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { readProfileByUserId } from "@/modules/auth/repositories";
import { parsePackageAccessKeysFromReadPath } from "@/modules/packages/access-keys";
import { validateActiveAppSession } from "@/modules/sessions/services";

import {
  derivePackageSummaryFromAccessKeys,
  sortPackageAccessKeysCanonical,
  type PackageAccessKey,
  type PackageEditorData,
  type PackageFormInput,
  type PackageRow,
  type PackageSummary,
  type PackageTableResult,
  type PackageTableSortKey,
  type PackageTableSortOrder,
  type PackageToggleInput,
} from "./types";

type PackageDatabaseRow = {
  access_keys_json: unknown;
  amount_rp: number;
  checkout_url: string | null;
  code: string;
  created_at: string;
  duration_days: number;
  id: string;
  is_active: boolean;
  is_extended: boolean;
  name: string;
  updated_at: string;
};

type GetPackageSummaryResponse = PackageSummary | null;

const packageDatabaseRowSchema = z.object({
  access_keys_json: z.unknown(),
  amount_rp: z.number().int().safe(),
  checkout_url: z.string().nullable(),
  code: z.string().min(1),
  created_at: z.string().min(1),
  duration_days: z.number().int().safe(),
  id: z.guid(),
  is_active: z.boolean(),
  is_extended: z.boolean(),
  name: z.string().min(1),
  updated_at: z.string().min(1),
});

const currentSubscriptionRowSchema = z.object({
  package_id: z.guid(),
});

type CurrentSubscriptionRow = {
  package_id: string;
};

type PackageListInput = {
  order: PackageTableSortOrder | null;
  page: number;
  pageSize: number;
  search: string | null;
  sort: PackageTableSortKey | null;
  summary: PackageSummary | null;
};

type CreatePackageRowInput = PackageFormInput & {
  code: string;
  isActive: boolean;
};

type UpdatePackageRowInput = PackageFormInput & {
  id: string;
};

function createPackagesRepositoryDatabase() {
  return createInsForgeAdminDatabase();
}

async function authorizeMemberPackageRead() {
  const activeSession = await validateActiveAppSession();

  if (!activeSession) {
    return null;
  }

  const profile = await readProfileByUserId(activeSession.userId);

  if (!profile || profile.role !== "member" || profile.isBanned) {
    return null;
  }

  return activeSession.userId;
}

const PACKAGE_BASE_SELECT_FIELDS =
  "id, code, name, amount_rp, duration_days, checkout_url, is_extended, is_active, access_keys_json, created_at, updated_at";

function parsePackageDatabaseRows(data: unknown): PackageDatabaseRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(packageDatabaseRowSchema).parse(data);
}

function parseCurrentSubscriptionsByPackageRows(data: unknown): CurrentSubscriptionRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return z.array(currentSubscriptionRowSchema).parse(data);
}

function mapPackageDatabaseRow(data: PackageDatabaseRow): PackageRow {
  return {
    accessKeys: parsePackageAccessKeysFromReadPath(data.access_keys_json),
    amountRp: data.amount_rp,
    checkoutUrl: data.checkout_url,
    code: data.code,
    createdAt: data.created_at,
    durationDays: data.duration_days,
    id: data.id,
    isActive: data.is_active,
    isExtended: data.is_extended,
    name: data.name,
    updatedAt: data.updated_at,
  };
}

function sortPackageDatabaseRows(
  rows: PackageDatabaseRow[],
  input: {
    order: PackageTableSortOrder | null;
    sort: PackageTableSortKey | null;
  },
) {
  if (!input.sort || !input.order) {
    return rows;
  }

  const direction = input.order === "asc" ? 1 : -1;

  return [...rows].sort((leftRow, rightRow) => {
    if (input.sort === "status") {
      return (Number(leftRow.is_active) - Number(rightRow.is_active)) * direction;
    }

    return (new Date(leftRow.updated_at).getTime() - new Date(rightRow.updated_at).getTime()) * direction;
  });
}

async function listPackagesBySearch(input: { search: string | null }) {
  const database = createPackagesRepositoryDatabase();
  let query = database.from("packages").select(PACKAGE_BASE_SELECT_FIELDS).order("created_at", { ascending: false });

  if (input.search) {
    query = query.ilike("name", `%${input.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return parsePackageDatabaseRows(data);
}

function filterPackageRowsBySummary(packageRows: PackageDatabaseRow[], summary: PackageSummary | null) {
  return packageRows.filter((packageRow) => {
    const derivedSummary = derivePackageSummaryFromAccessKeys(
      parsePackageAccessKeysFromReadPath(packageRow.access_keys_json),
    );

    if (!derivedSummary) {
      return false;
    }

    if (!summary) {
      return true;
    }

    return derivedSummary === summary;
  });
}

export async function listPackages(input: PackageListInput): Promise<PackageTableResult<PackageRow>> {
  const startIndex = (input.page - 1) * input.pageSize;
  const allCandidateRows = await listPackagesBySearch({
    search: input.search,
  });
  const filteredRows = sortPackageDatabaseRows(filterPackageRowsBySummary(allCandidateRows, input.summary), {
    order: input.order,
    sort: input.sort,
  });
  const pagedRows = filteredRows.slice(startIndex, startIndex + input.pageSize).map(mapPackageDatabaseRow);

  return {
    items: pagedRows,
    page: input.page,
    pageSize: input.pageSize,
    totalCount: filteredRows.length,
  };
}

export async function getPackageRowById(packageId: string): Promise<PackageRow | null> {
  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .eq("id", packageId)
    .maybeSingle<PackageDatabaseRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPackageDatabaseRow(data);
}

export async function listPackageRowsByIds(packageIds: string[]): Promise<PackageRow[]> {
  if (packageIds.length === 0) {
    return [];
  }

  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .in("id", packageIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return parsePackageDatabaseRows(data).map(mapPackageDatabaseRow);
}

export async function getPackageById(packageId: string): Promise<PackageRow | null> {
  return getPackageRowById(packageId);
}

export async function listActivePackageRowsForMember(): Promise<PackageRow[]> {
  const authorizedUserId = await authorizeMemberPackageRead();

  if (!authorizedUserId) {
    return [];
  }

  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("packages")
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return parsePackageDatabaseRows(data).map(mapPackageDatabaseRow);
}

export async function getActivePackageRowByIdForMember(packageId: string): Promise<PackageRow | null> {
  const authorizedUserId = await authorizeMemberPackageRead();

  if (!authorizedUserId) {
    return null;
  }

  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("packages")
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .eq("id", packageId)
    .eq("is_active", true)
    .maybeSingle<PackageDatabaseRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPackageDatabaseRow(data);
}

export async function getPackageEditorData(packageId: string): Promise<PackageEditorData | null> {
  const packageRow = await getPackageById(packageId);

  if (!packageRow) {
    return null;
  }

  return {
    accessKeys: sortPackageAccessKeysCanonical(packageRow.accessKeys),
    amountRp: packageRow.amountRp,
    checkoutUrl: packageRow.checkoutUrl,
    code: packageRow.code,
    durationDays: packageRow.durationDays,
    id: packageRow.id,
    isActive: packageRow.isActive,
    isExtended: packageRow.isExtended,
    name: packageRow.name,
  };
}

export async function createPackageRow(input: CreatePackageRowInput): Promise<PackageRow> {
  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .insert([
      {
        access_keys_json: input.accessKeys,
        amount_rp: input.amountRp,
        checkout_url: input.checkoutUrl,
        code: input.code,
        duration_days: input.durationDays,
        is_active: input.isActive,
        is_extended: input.isExtended,
        name: input.name,
      },
    ])
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .single<PackageDatabaseRow>();

  if (error) {
    throw error;
  }

  return mapPackageDatabaseRow(data);
}

export async function updatePackageRow(input: UpdatePackageRowInput): Promise<PackageRow> {
  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .update({
      access_keys_json: input.accessKeys,
      amount_rp: input.amountRp,
      checkout_url: input.checkoutUrl,
      duration_days: input.durationDays,
      is_extended: input.isExtended,
      name: input.name,
    })
    .eq("id", input.id)
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .single<PackageDatabaseRow>();

  if (error) {
    throw error;
  }

  return mapPackageDatabaseRow(data);
}

export async function togglePackageActiveRow(input: PackageToggleInput): Promise<PackageRow> {
  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database
    .from("packages")
    .update({ is_active: input.isActive })
    .eq("id", input.id)
    .select(PACKAGE_BASE_SELECT_FIELDS)
    .single<PackageDatabaseRow>();

  if (error) {
    throw error;
  }

  return mapPackageDatabaseRow(data);
}

export async function getPackageSummary(accessKeys: PackageAccessKey[]): Promise<PackageSummary | null> {
  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database.rpc("get_package_summary", {
    p_access_keys_json: accessKeys,
  });

  if (error) {
    throw error;
  }

  return data as GetPackageSummaryResponse;
}

export async function countPackageTotalUsed(packageId: string): Promise<number> {
  const database = createPackagesRepositoryDatabase();
  const { count, error } = await database
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("package_id", packageId)
    .in("status", ["active", "processed"])
    .gt("end_at", new Date().toISOString());

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function listCurrentSubscriptionsByPackageIds(packageIds: string[]): Promise<CurrentSubscriptionRow[]> {
  if (packageIds.length === 0) {
    return [];
  }

  const database = createPackagesRepositoryDatabase();
  const { data, error } = await database
    .from("v_current_subscriptions")
    .select("package_id")
    .in("package_id", packageIds);

  if (error) {
    throw error;
  }

  return parseCurrentSubscriptionsByPackageRows(data);
}
