import "server-only";

import {
  getSubscriptionById,
  getPackageById,
  listCandidateAssetsByAccessKey,
  listCurrentAssignmentsBySubscriptionId,
  listPackagesForAdminSelection,
  listSubscriberSubscriptionsForTable,
  listSuccessfulTransactionTotalsByUserIds,
  searchMemberProfiles,
} from "@/modules/subscriptions/repositories";

import {
  subscriberActivationDraftInputSchema,
  subscriberEditorDataInputSchema,
  subscriberTableFilterSchema,
  subscriberUserSearchSchema,
} from "./schemas";

import type {
  SubscriberActivationDraft,
  SubscriberAdminRow,
  SubscriberEditorData,
  SubscriberPackageOption,
  SubscriberTableFilters,
  SubscriberTableResult,
  SubscriberTableSourceRow,
  SubscriberUserOption,
} from "./types";

function createUserSelectionMap(rows: SubscriberTableSourceRow[]) {
  const rowsByUserId = new Map<string, SubscriberTableSourceRow[]>();

  for (const row of rows) {
    const currentRows = rowsByUserId.get(row.userId) ?? [];
    currentRows.push(row);
    rowsByUserId.set(row.userId, currentRows);
  }

  return rowsByUserId;
}

function selectSubscriberRow(rows: SubscriberTableSourceRow[]): SubscriberTableSourceRow {
  const runningRow = rows.find((row) => row.isRunning);

  if (runningRow) {
    return runningRow;
  }

  return [...rows].sort((leftRow, rightRow) => {
    const createdAtDifference = new Date(rightRow.createdAt).getTime() - new Date(leftRow.createdAt).getTime();

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return rightRow.subscriptionId.localeCompare(leftRow.subscriptionId);
  })[0];
}

function mapSubscriberRow(row: SubscriberTableSourceRow, totalSpentRp: number): SubscriberAdminRow {
  return {
    userId: row.userId,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatarUrl,
    subscriptionId: row.subscriptionId,
    subscriptionStatus: row.status,
    startAt: row.startAt,
    expiresAt: row.endAt,
    packageId: row.packageId,
    packageName: row.packageName,
    accessKeys: row.accessKeys,
    totalSpentRp,
    selectedSubscriptionUpdatedAt: row.updatedAt,
  };
}

function sortSubscriberRows(rows: SubscriberAdminRow[]) {
  return [...rows].sort((leftRow, rightRow) => {
    const leftIsRunning = ["active", "processed"].includes(leftRow.subscriptionStatus);
    const rightIsRunning = ["active", "processed"].includes(rightRow.subscriptionStatus);

    if (leftIsRunning !== rightIsRunning) {
      return rightIsRunning ? 1 : -1;
    }

    const updatedAtDifference =
      new Date(rightRow.selectedSubscriptionUpdatedAt).getTime() -
      new Date(leftRow.selectedSubscriptionUpdatedAt).getTime();

    if (updatedAtDifference !== 0) {
      return updatedAtDifference;
    }

    return rightRow.userId.localeCompare(leftRow.userId);
  });
}

function matchesSubscriberFilters(row: SubscriberAdminRow, filters: SubscriberTableFilters) {
  if (filters.search) {
    const normalizedSearch = filters.search.toLowerCase();
    const matchesSearch = [row.userId, row.username, row.email].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    );

    if (!matchesSearch) {
      return false;
    }
  }

  if (filters.assetType && !row.accessKeys.some((accessKey) => accessKey.endsWith(`:${filters.assetType}`))) {
    return false;
  }

  if (filters.status && row.subscriptionStatus !== filters.status) {
    return false;
  }

  const expiresAtTimestamp = new Date(row.expiresAt).getTime();

  if (filters.expiresFrom && expiresAtTimestamp < new Date(`${filters.expiresFrom}T00:00:00.000Z`).getTime()) {
    return false;
  }

  if (filters.expiresTo && expiresAtTimestamp > new Date(`${filters.expiresTo}T23:59:59.999Z`).getTime()) {
    return false;
  }

  return true;
}

export async function getSubscriberTablePage(input: SubscriberTableFilters): Promise<SubscriberTableResult> {
  const parsedFilters = subscriberTableFilterSchema.parse(input);
  const sourceRows = await listSubscriberSubscriptionsForTable(parsedFilters);
  const rowsByUserId = createUserSelectionMap(sourceRows);
  const selectedRows = [...rowsByUserId.values()].map(selectSubscriberRow);
  const totalSpentByUserId = await listSuccessfulTransactionTotalsByUserIds(selectedRows.map((row) => row.userId));

  const mappedRows = sortSubscriberRows(
    selectedRows.map((row) => mapSubscriberRow(row, totalSpentByUserId[row.userId] ?? 0)),
  );
  const filteredRows = mappedRows.filter((row) => matchesSubscriberFilters(row, parsedFilters));

  const pageStart = (parsedFilters.page - 1) * parsedFilters.pageSize;
  const pageEnd = pageStart + parsedFilters.pageSize;

  return {
    items: filteredRows.slice(pageStart, pageEnd),
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    totalCount: filteredRows.length,
  };
}

export async function getSubscriberEditorData(input: {
  userId?: string;
  subscriptionId?: string;
}): Promise<SubscriberEditorData> {
  const parsedInput = subscriberEditorDataInputSchema.parse(input);
  const packageOptions = (await listPackagesForAdminSelection()).map<SubscriberPackageOption>(
    (packageOption) => packageOption,
  );
  const currentAssignments = parsedInput.subscriptionId
    ? await listCurrentAssignmentsBySubscriptionId(parsedInput.subscriptionId)
    : [];

  const selectedUser = parsedInput.userId
    ? ((await searchMemberProfiles({ query: parsedInput.userId, page: 1, pageSize: 20 })).users.find(
        (user) => user.userId === parsedInput.userId,
      ) ?? null)
    : null;
  const selectedSubscriptionRecord = parsedInput.subscriptionId
    ? await getSubscriptionById(parsedInput.subscriptionId)
    : null;
  const totalSpentByUserId = selectedUser ? await listSuccessfulTransactionTotalsByUserIds([selectedUser.userId]) : {};
  const selectedSubscription =
    selectedUser && selectedSubscriptionRecord
      ? {
          userId: selectedUser.userId,
          username: selectedUser.username,
          email: selectedUser.email,
          avatarUrl: selectedUser.avatarUrl,
          subscriptionId: selectedSubscriptionRecord.id,
          subscriptionStatus: selectedSubscriptionRecord.status,
          startAt: selectedSubscriptionRecord.startAt,
          expiresAt: selectedSubscriptionRecord.endAt,
          packageId: selectedSubscriptionRecord.packageId,
          packageName: selectedSubscriptionRecord.packageName,
          accessKeys: selectedSubscriptionRecord.accessKeys,
          totalSpentRp: totalSpentByUserId[selectedUser.userId] ?? 0,
          selectedSubscriptionUpdatedAt: selectedSubscriptionRecord.updatedAt,
        }
      : null;
  const defaultPackageId = selectedSubscription?.packageId ?? null;
  const defaultDurationDays = defaultPackageId
    ? (packageOptions.find((packageOption) => packageOption.packageId === defaultPackageId)?.durationDays ?? null)
    : null;

  return {
    selectedUser,
    selectedSubscription,
    packageOptions,
    defaultPackageId,
    defaultDurationDays,
    currentAssignments,
  };
}

export async function searchSubscriberUsers(input: {
  query: string;
  page: number;
  pageSize: number;
}): Promise<{ users: SubscriberUserOption[]; totalCount: number }> {
  const parsedInput = subscriberUserSearchSchema.parse(input);
  return searchMemberProfiles(parsedInput);
}

export async function getSubscriberActivationDraft(input: {
  userId: string;
  packageId: string;
  subscriptionId?: string | null;
}): Promise<SubscriberActivationDraft> {
  const parsedInput = subscriberActivationDraftInputSchema.parse(input);
  const packageSnapshot = await getPackageById(parsedInput.packageId);

  if (!packageSnapshot) {
    throw new Error("Package not found.");
  }

  const currentAssignments = parsedInput.subscriptionId
    ? await listCurrentAssignmentsBySubscriptionId(parsedInput.subscriptionId)
    : [];

  const candidateGroups = await Promise.all(
    packageSnapshot.accessKeys.map(async (accessKey) => {
      const [platform, assetType] = accessKey.split(":") as [
        (typeof packageSnapshot.accessKeys)[number],
        "private" | "share",
      ];
      const currentSelection = currentAssignments.find((assignment) => assignment.accessKey === accessKey) ?? null;
      const candidates = await listCandidateAssetsByAccessKey({
        accessKey,
        userId: parsedInput.userId,
        subscriptionId: parsedInput.subscriptionId,
      });

      return {
        accessKey,
        platform: platform as never,
        assetType,
        currentSelection,
        candidates: candidates.map((candidate) => ({
          ...candidate,
          isCurrentSelection: candidate.assetId === currentSelection?.assetId,
        })),
        isFulfilled: currentSelection !== null,
        canQuickAddPrivateAsset: assetType === "private",
      };
    }),
  );

  return {
    userId: parsedInput.userId,
    packageId: parsedInput.packageId,
    subscriptionId: parsedInput.subscriptionId,
    packageSnapshot: {
      packageId: packageSnapshot.packageId,
      name: packageSnapshot.name,
      amountRp: packageSnapshot.amountRp,
      durationDays: packageSnapshot.durationDays,
      isExtended: packageSnapshot.isExtended,
      accessKeys: packageSnapshot.accessKeys,
    },
    defaultDurationDays: packageSnapshot.durationDays,
    candidateGroups,
  };
}
