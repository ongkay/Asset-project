import "server-only";

import { createInsForgeAdminDatabase } from "@/lib/insforge/database";
import { getIssuablePackageSnapshotsByIds } from "@/modules/packages/services";
import {
  PACKAGE_ACCESS_KEYS,
  derivePackageSummaryFromAccessKeys,
  type PackageAccessKey,
} from "@/modules/packages/types";

import { cdKeyDetailInputSchema, cdKeyTableFilterSchema } from "./schemas";

import type {
  CdKeyAdminRow,
  CdKeyDetailSnapshot,
  CdKeyPackageOption,
  CdKeyTableFilters,
  CdKeyTablePackageOption,
  CdKeyTableResult,
  CdKeyUserIdentity,
} from "./types";

type CdKeyJoinedRow = {
  id: string;
  code: string;
  package_id: string;
  duration_days: number;
  is_extended: boolean;
  access_keys_json: string[];
  amount_rp: number;
  is_active: boolean;
  used_at: string | null;
  created_at: string;
  updated_at: string;
  package: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  created_by_profile: {
    user_id: string;
    username: string;
    email: string;
    avatar_url: string | null;
  } | null;
  used_by_profile: {
    user_id: string;
    username: string;
    email: string;
    avatar_url: string | null;
  } | null;
};

type CdKeyRawJoinedRow = Omit<CdKeyJoinedRow, "package" | "created_by_profile" | "used_by_profile"> & {
  package: CdKeyJoinedRow["package"] | CdKeyJoinedRow["package"][];
  created_by_profile: CdKeyJoinedRow["created_by_profile"] | CdKeyJoinedRow["created_by_profile"][];
  used_by_profile: CdKeyJoinedRow["used_by_profile"] | CdKeyJoinedRow["used_by_profile"][];
};

type ActivePackageIdRow = {
  id: string;
};

type CdKeyPackageOptionRow = {
  package_id: string;
  package:
    | {
        id: string;
        name: string;
        is_active: boolean;
      }
    | {
        id: string;
        name: string;
        is_active: boolean;
      }[]
    | null;
};

type CdKeyIdRow = {
  id: string;
};

const PRIVATE_ACCESS_KEYS = PACKAGE_ACCESS_KEYS.filter((accessKey): accessKey is PackageAccessKey =>
  accessKey.endsWith(":private"),
);
const SHARE_ACCESS_KEYS = PACKAGE_ACCESS_KEYS.filter((accessKey): accessKey is PackageAccessKey =>
  accessKey.endsWith(":share"),
);

const PRIVATE_ACCESS_KEYS_JSON = JSON.stringify(PRIVATE_ACCESS_KEYS);
const SHARE_ACCESS_KEYS_JSON = JSON.stringify(SHARE_ACCESS_KEYS);

function normalizeSearchTerm(search: string | null) {
  const trimmedSearch = search?.trim();
  return trimmedSearch ? trimmedSearch : null;
}

function buildSearchPattern(searchTerm: string) {
  return `%${searchTerm}%`;
}

function toIdentityOrNull(profile: CdKeyJoinedRow["used_by_profile"]): CdKeyUserIdentity | null {
  if (!profile) {
    return null;
  }

  return {
    userId: profile.user_id,
    username: profile.username,
    email: profile.email,
    avatarUrl: profile.avatar_url,
  };
}

function toRequiredIdentity(profile: CdKeyJoinedRow["created_by_profile"]): CdKeyUserIdentity {
  if (!profile) {
    throw new Error("CD key creator profile is missing.");
  }

  return {
    userId: profile.user_id,
    username: profile.username,
    email: profile.email,
    avatarUrl: profile.avatar_url,
  };
}

function parseSnapshotAccessKeys(accessKeys: string[]): PackageAccessKey[] {
  if (accessKeys.length === 0) {
    throw new Error("CD key access keys must not be empty.");
  }

  const parsedAccessKeys: PackageAccessKey[] = [];

  for (const accessKey of accessKeys) {
    if (!(PACKAGE_ACCESS_KEYS as readonly string[]).includes(accessKey)) {
      throw new Error("CD key access keys contain invalid value.");
    }

    parsedAccessKeys.push(accessKey as PackageAccessKey);
  }

  return parsedAccessKeys;
}

function deriveRequiredPackageSummary(accessKeys: string[]) {
  const summary = derivePackageSummaryFromAccessKeys(parseSnapshotAccessKeys(accessKeys));

  if (!summary) {
    throw new Error("CD key package summary cannot be derived.");
  }

  return summary;
}

function mapCdKeyAdminRow(row: CdKeyJoinedRow): CdKeyAdminRow {
  return {
    id: row.id,
    code: row.code,
    packageId: row.package_id,
    packageName: row.package?.name ?? null,
    packageSummary: deriveRequiredPackageSummary(row.access_keys_json),
    status: row.used_at ? "used" : "unused",
    isActive: row.is_active,
    usedBy: toIdentityOrNull(row.used_by_profile),
    createdBy: toRequiredIdentity(row.created_by_profile),
    usedAt: row.used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resolveJoinedRecord<TRecord>(value: TRecord | TRecord[] | null): TRecord | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeJoinedRow(rawRow: CdKeyRawJoinedRow): CdKeyJoinedRow {
  return {
    ...rawRow,
    package: resolveJoinedRecord(rawRow.package),
    created_by_profile: resolveJoinedRecord(rawRow.created_by_profile),
    used_by_profile: resolveJoinedRecord(rawRow.used_by_profile),
  };
}

function mapCdKeyDetailSnapshot(row: CdKeyJoinedRow): CdKeyDetailSnapshot {
  return {
    id: row.id,
    code: row.code,
    packageId: row.package_id,
    packageName: row.package?.name ?? null,
    packageSummary: deriveRequiredPackageSummary(row.access_keys_json),
    amountRp: row.amount_rp,
    durationDays: row.duration_days,
    isExtended: row.is_extended,
    accessKeys: parseSnapshotAccessKeys(row.access_keys_json),
    isActive: row.is_active,
    createdBy: toRequiredIdentity(row.created_by_profile),
    usedBy: toIdentityOrNull(row.used_by_profile),
    usedAt: row.used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildPackageFilterOptionsFromRows(rows: CdKeyPackageOptionRow[]): CdKeyTablePackageOption[] {
  const packageById = new Map<string, CdKeyTablePackageOption>();

  for (const row of rows) {
    const resolvedPackage = resolveJoinedRecord(row.package);

    if (packageById.has(row.package_id)) {
      continue;
    }

    packageById.set(row.package_id, {
      packageId: row.package_id,
      packageName: resolvedPackage?.name ?? null,
      isActive: resolvedPackage?.is_active ?? null,
    });
  }

  return [...packageById.values()].sort((leftOption, rightOption) => {
    const leftName = leftOption.packageName ?? "";
    const rightName = rightOption.packageName ?? "";
    const byName = leftName.localeCompare(rightName);

    if (byName !== 0) {
      return byName;
    }

    return leftOption.packageId.localeCompare(rightOption.packageId);
  });
}

function appendCdKeyIds(targetIds: Set<string>, data: unknown) {
  if (!Array.isArray(data)) {
    return;
  }

  for (const row of data) {
    if (!row || typeof row !== "object" || !("id" in row)) {
      continue;
    }

    const id = (row as CdKeyIdRow).id;

    if (typeof id !== "string" || id.length === 0) {
      continue;
    }

    targetIds.add(id);
  }
}

async function listMatchedCdKeyIdsBySearch(
  filters: Pick<CdKeyTableFilters, "packageId" | "status" | "packageSummary">,
  normalizedSearch: string,
) {
  const database = createInsForgeAdminDatabase();
  const searchPattern = buildSearchPattern(normalizedSearch);

  let codeQuery = database.from("cd_keys").select("id");

  if (filters.packageId) {
    codeQuery = codeQuery.eq("package_id", filters.packageId);
  }

  if (filters.status === "unused") {
    codeQuery = codeQuery.is("used_at", null);
  }

  if (filters.status === "used") {
    codeQuery = codeQuery.not("used_at", "is", null);
  }

  if (filters.packageSummary === "private") {
    codeQuery = codeQuery.filter("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "share") {
    codeQuery = codeQuery.filter("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "mixed") {
    codeQuery = codeQuery
      .not("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON)
      .not("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  codeQuery = codeQuery.ilike("code", searchPattern);

  let packageNameQuery = database.from("cd_keys").select("id, package:packages!inner(id,name,is_active)");

  if (filters.packageId) {
    packageNameQuery = packageNameQuery.eq("package_id", filters.packageId);
  }

  if (filters.status === "unused") {
    packageNameQuery = packageNameQuery.is("used_at", null);
  }

  if (filters.status === "used") {
    packageNameQuery = packageNameQuery.not("used_at", "is", null);
  }

  if (filters.packageSummary === "private") {
    packageNameQuery = packageNameQuery.filter("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "share") {
    packageNameQuery = packageNameQuery.filter("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "mixed") {
    packageNameQuery = packageNameQuery
      .not("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON)
      .not("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  packageNameQuery = packageNameQuery.ilike("package.name", searchPattern);

  let usedByUsernameQuery = database
    .from("cd_keys")
    .select("id, used_by_profile:profiles!cd_keys_used_by_fkey!inner(user_id,username,email,avatar_url)");

  if (filters.packageId) {
    usedByUsernameQuery = usedByUsernameQuery.eq("package_id", filters.packageId);
  }

  if (filters.status === "unused") {
    usedByUsernameQuery = usedByUsernameQuery.is("used_at", null);
  }

  if (filters.status === "used") {
    usedByUsernameQuery = usedByUsernameQuery.not("used_at", "is", null);
  }

  if (filters.packageSummary === "private") {
    usedByUsernameQuery = usedByUsernameQuery.filter("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "share") {
    usedByUsernameQuery = usedByUsernameQuery.filter("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "mixed") {
    usedByUsernameQuery = usedByUsernameQuery
      .not("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON)
      .not("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  usedByUsernameQuery = usedByUsernameQuery.ilike("used_by_profile.username", searchPattern);

  let usedByEmailQuery = database
    .from("cd_keys")
    .select("id, used_by_profile:profiles!cd_keys_used_by_fkey!inner(user_id,username,email,avatar_url)");

  if (filters.packageId) {
    usedByEmailQuery = usedByEmailQuery.eq("package_id", filters.packageId);
  }

  if (filters.status === "unused") {
    usedByEmailQuery = usedByEmailQuery.is("used_at", null);
  }

  if (filters.status === "used") {
    usedByEmailQuery = usedByEmailQuery.not("used_at", "is", null);
  }

  if (filters.packageSummary === "private") {
    usedByEmailQuery = usedByEmailQuery.filter("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "share") {
    usedByEmailQuery = usedByEmailQuery.filter("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  if (filters.packageSummary === "mixed") {
    usedByEmailQuery = usedByEmailQuery
      .not("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON)
      .not("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  usedByEmailQuery = usedByEmailQuery.ilike("used_by_profile.email", searchPattern);

  const [
    { data: codeRows, error: codeError },
    { data: packageRows, error: packageError },
    { data: usedByUsernameRows, error: usedByUsernameError },
    { data: usedByEmailRows, error: usedByEmailError },
  ] = await Promise.all([codeQuery, packageNameQuery, usedByUsernameQuery, usedByEmailQuery]);

  if (codeError) {
    throw codeError;
  }

  if (packageError) {
    throw packageError;
  }

  if (usedByUsernameError) {
    throw usedByUsernameError;
  }

  if (usedByEmailError) {
    throw usedByEmailError;
  }

  const matchedIds = new Set<string>();

  appendCdKeyIds(matchedIds, codeRows);
  appendCdKeyIds(matchedIds, packageRows);
  appendCdKeyIds(matchedIds, usedByUsernameRows);
  appendCdKeyIds(matchedIds, usedByEmailRows);

  return [...matchedIds];
}

async function listCdKeyPackageOptions(): Promise<CdKeyTablePackageOption[]> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("cd_keys")
    .select("package_id, package:packages(id,name,is_active)")
    .order("package_id", { ascending: true });

  if (error) {
    throw error;
  }

  return buildPackageFilterOptionsFromRows(Array.isArray(data) ? (data as CdKeyPackageOptionRow[]) : []);
}

export async function getCdKeyTablePage(input: CdKeyTableFilters): Promise<CdKeyTableResult> {
  const parsedFilters = cdKeyTableFilterSchema.parse(input);
  const packageOptionsPromise = listCdKeyPackageOptions();
  const normalizedSearch = normalizeSearchTerm(parsedFilters.search);

  const startIndex = (parsedFilters.page - 1) * parsedFilters.pageSize;
  const endIndex = startIndex + parsedFilters.pageSize - 1;

  const database = createInsForgeAdminDatabase();
  let pagedQuery = database
    .from("cd_keys")
    .select(
      "id, code, package_id, duration_days, is_extended, access_keys_json, amount_rp, is_active, used_at, created_at, updated_at, package:packages(id,name,is_active), created_by_profile:profiles!cd_keys_created_by_fkey(user_id,username,email,avatar_url), used_by_profile:profiles!cd_keys_used_by_fkey(user_id,username,email,avatar_url)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (parsedFilters.packageId) {
    pagedQuery = pagedQuery.eq("package_id", parsedFilters.packageId);
  }

  if (parsedFilters.status === "unused") {
    pagedQuery = pagedQuery.is("used_at", null);
  }

  if (parsedFilters.status === "used") {
    pagedQuery = pagedQuery.not("used_at", "is", null);
  }

  if (parsedFilters.packageSummary === "private") {
    pagedQuery = pagedQuery.filter("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON);
  }

  if (parsedFilters.packageSummary === "share") {
    pagedQuery = pagedQuery.filter("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  if (parsedFilters.packageSummary === "mixed") {
    pagedQuery = pagedQuery
      .not("access_keys_json", "cd", PRIVATE_ACCESS_KEYS_JSON)
      .not("access_keys_json", "cd", SHARE_ACCESS_KEYS_JSON);
  }

  if (normalizedSearch) {
    const matchedIds = await listMatchedCdKeyIdsBySearch(
      {
        packageId: parsedFilters.packageId,
        status: parsedFilters.status,
        packageSummary: parsedFilters.packageSummary,
      },
      normalizedSearch,
    );

    if (matchedIds.length === 0) {
      return {
        items: [],
        packageOptions: await packageOptionsPromise,
        page: parsedFilters.page,
        pageSize: parsedFilters.pageSize,
        totalCount: 0,
      };
    }

    pagedQuery = pagedQuery.in("id", matchedIds);
  }

  const rangedPagedQuery = pagedQuery.range(startIndex, endIndex);
  const [{ count, data, error }, packageOptions] = await Promise.all([rangedPagedQuery, packageOptionsPromise]);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? (data as CdKeyRawJoinedRow[]).map(normalizeJoinedRow) : [];

  return {
    items: rows.map(mapCdKeyAdminRow),
    packageOptions,
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    totalCount: count ?? 0,
  };
}

export async function getCdKeyDetailSnapshot(input: { id: string }): Promise<CdKeyDetailSnapshot | null> {
  const parsedInput = cdKeyDetailInputSchema.parse(input);
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database
    .from("cd_keys")
    .select(
      "id, code, package_id, duration_days, is_extended, access_keys_json, amount_rp, is_active, used_at, created_at, updated_at, package:packages(id,name,is_active), created_by_profile:profiles!cd_keys_created_by_fkey(user_id,username,email,avatar_url), used_by_profile:profiles!cd_keys_used_by_fkey(user_id,username,email,avatar_url)",
    )
    .eq("id", parsedInput.id)
    .maybeSingle<CdKeyRawJoinedRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapCdKeyDetailSnapshot(normalizeJoinedRow(data));
}

export async function listIssuablePackages(): Promise<CdKeyPackageOption[]> {
  const database = createInsForgeAdminDatabase();
  const { data, error } = await database.from("packages").select("id").eq("is_active", true).order("name", {
    ascending: true,
  });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? (data as ActivePackageIdRow[]) : [];
  const snapshots = await getIssuablePackageSnapshotsByIds(rows.map((row) => row.id));

  return snapshots.map((snapshot) => {
    if (!snapshot.summary) {
      throw new Error("Package summary cannot be derived from snapshot access keys.");
    }

    return {
      packageId: snapshot.id,
      name: snapshot.name,
      amountRp: snapshot.amountRp,
      durationDays: snapshot.durationDays,
      isExtended: snapshot.isExtended,
      accessKeys: snapshot.accessKeys,
      packageSummary: snapshot.summary,
    };
  });
}
