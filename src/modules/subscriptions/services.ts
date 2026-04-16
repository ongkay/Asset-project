import "server-only";

import { createAsset } from "@/modules/assets/services";
import { parseAssetJsonText } from "@/modules/assets/schemas";

import { adminManualActivationFormSchema, subscriberCancelSchema, subscriberQuickAddAssetSchema } from "./schemas";
import {
  applySubscriptionStatus,
  assignBestAssetForSubscription,
  cancelSubscriptionRow,
  createSubscriptionWithSnapshot,
  createTransactionRow,
  getPackageById,
  getRunningSubscriptionByUserId,
  getSubscriptionById,
  insertManualAssignmentRow,
  listActiveAssignmentsBySubscriptionId,
  revokeActiveAssignmentsBySubscriptionId,
  updateSubscriptionWindow,
} from "./repositories";

import type {
  AdminManualActivationFormValues,
  AdminManualActivationInput,
  ManualAssignmentsByAccessKey,
  SubscriberCancelInput,
  SubscriberQuickAddAssetInput,
  SubscriberQuickAddAssetValues,
  SubscriptionActivationMode,
  SubscriptionActivationResult,
  SubscriptionPackageSnapshot,
  SubscriptionRow,
} from "./types";

function toDurationMilliseconds(durationDays: number) {
  return durationDays * 24 * 60 * 60 * 1000;
}

function addDaysToIso(startAtIso: string, durationDays: number) {
  return new Date(new Date(startAtIso).getTime() + toDurationMilliseconds(durationDays)).toISOString();
}

function toTransactionCode() {
  return `TX-ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function isActivationInput(
  value: AdminManualActivationInput | AdminManualActivationFormValues,
): value is AdminManualActivationInput {
  return "packageSnapshot" in value;
}

async function resolveActivationInput(
  input: AdminManualActivationInput | AdminManualActivationFormValues,
): Promise<AdminManualActivationInput> {
  if (isActivationInput(input)) {
    return input;
  }

  const parsedInput = adminManualActivationFormSchema.parse(input);
  const packageSnapshot = await getPackageById(parsedInput.packageId);

  if (!packageSnapshot) {
    throw new Error("Package not found.");
  }

  if (packageSnapshot.isActive === false) {
    throw new Error("Package is disabled.");
  }

  return {
    userId: parsedInput.userId,
    packageSnapshot,
    durationDays: parsedInput.durationDays,
    manualAssignmentsByAccessKey: parsedInput.manualAssignmentsByAccessKey,
    existingRunningSubscriptionId: null,
  };
}

function getReplacementMode(input: {
  runningSubscription: SubscriptionRow | null;
  packageSnapshot: SubscriptionPackageSnapshot;
}): SubscriptionActivationMode {
  if (!input.runningSubscription) {
    return "create-new";
  }

  if (input.runningSubscription.packageId === input.packageSnapshot.packageId && input.packageSnapshot.isExtended) {
    return "extend-existing";
  }

  return input.packageSnapshot.isExtended ? "replace-with-carry-over" : "replace-immediately";
}

function getFulfilledAccessKeys(activeAssignments: { accessKey: string }[]) {
  return new Set(activeAssignments.map((assignment) => assignment.accessKey));
}

async function fulfillSubscriptionAccessKeys(input: {
  subscriptionId: string;
  userId: string;
  accessKeys: string[];
  manualAssignmentsByAccessKey: ManualAssignmentsByAccessKey;
}) {
  const currentAssignments = await listActiveAssignmentsBySubscriptionId(input.subscriptionId);
  const fulfilledAccessKeys = getFulfilledAccessKeys(currentAssignments);

  for (const accessKey of input.accessKeys) {
    const manualAssetId = input.manualAssignmentsByAccessKey[accessKey];

    if (manualAssetId && !fulfilledAccessKeys.has(accessKey)) {
      await insertManualAssignmentRow({
        subscriptionId: input.subscriptionId,
        userId: input.userId,
        accessKey,
        assetId: manualAssetId,
      });
      fulfilledAccessKeys.add(accessKey);
      continue;
    }

    if (!fulfilledAccessKeys.has(accessKey)) {
      await assignBestAssetForSubscription({
        subscriptionId: input.subscriptionId,
        accessKey,
        excludeAssetId: null,
      });
    }
  }
}

export function buildQuickAddAssetInput(
  input: SubscriberQuickAddAssetValues,
  packageSnapshot: SubscriptionPackageSnapshot,
  nowDate: Date = new Date(),
): SubscriberQuickAddAssetInput {
  const parsedInput = subscriberQuickAddAssetSchema.parse(input);
  const accessKey = `${parsedInput.platform}:private`;

  if (!packageSnapshot.accessKeys.includes(accessKey)) {
    throw new Error(`Selected package does not allow quick-add for ${accessKey}.`);
  }

  return {
    userId: parsedInput.userId,
    packageId: parsedInput.packageId,
    subscriptionId: parsedInput.subscriptionId,
    accessKey,
    platform: parsedInput.platform,
    assetType: "private",
    account: parsedInput.account,
    note: parsedInput.note,
    proxy: parsedInput.proxy,
    assetJson: parseAssetJsonText(parsedInput.assetJsonText),
    expiresAt: new Date(nowDate.getTime() + toDurationMilliseconds(parsedInput.durationDays)).toISOString(),
  };
}

export async function quickAddSubscriberAsset(input: SubscriberQuickAddAssetValues) {
  const parsedInput = subscriberQuickAddAssetSchema.parse(input);
  const packageSnapshot = await getPackageById(parsedInput.packageId);

  if (!packageSnapshot) {
    throw new Error("Package not found.");
  }

  const quickAddInput = buildQuickAddAssetInput(parsedInput, packageSnapshot);
  const createdAsset = await createAsset({
    platform: quickAddInput.platform,
    assetType: quickAddInput.assetType,
    account: quickAddInput.account,
    note: quickAddInput.note,
    proxy: quickAddInput.proxy,
    assetJson: quickAddInput.assetJson,
    expiresAt: quickAddInput.expiresAt,
  });

  return {
    assetId: createdAsset.id,
    accessKey: quickAddInput.accessKey,
  };
}

export async function activateSubscriptionManually(
  input: AdminManualActivationInput | AdminManualActivationFormValues,
): Promise<SubscriptionActivationResult> {
  const resolvedInput = await resolveActivationInput(input);

  if (resolvedInput.packageSnapshot.isActive === false) {
    throw new Error("Package is disabled.");
  }

  const nowIso = new Date().toISOString();
  const runningSubscription = await getRunningSubscriptionByUserId(resolvedInput.userId);
  const mode = getReplacementMode({
    runningSubscription,
    packageSnapshot: resolvedInput.packageSnapshot,
  });

  let targetSubscriptionId: string;

  if (mode === "extend-existing") {
    targetSubscriptionId = runningSubscription!.id;
    await updateSubscriptionWindow({
      subscriptionId: runningSubscription!.id,
      endAt: addDaysToIso(runningSubscription!.endAt, resolvedInput.durationDays),
    });
  } else {
    if (runningSubscription) {
      await cancelSubscriptionRow({
        subscriptionId: runningSubscription.id,
        cancelReason: "replaced_by_admin_manual",
      });
      await revokeActiveAssignmentsBySubscriptionId({
        subscriptionId: runningSubscription.id,
        revokeReason: "subscription_replaced",
      });
    }

    const baseStartAt = nowIso;
    const replacementBaseEndAt =
      mode === "replace-with-carry-over" && runningSubscription
        ? new Date(Math.max(new Date(runningSubscription.endAt).getTime(), new Date(nowIso).getTime())).toISOString()
        : nowIso;

    const createdSubscription = await createSubscriptionWithSnapshot({
      userId: resolvedInput.userId,
      packageId: resolvedInput.packageSnapshot.packageId,
      packageName: resolvedInput.packageSnapshot.name,
      accessKeys: resolvedInput.packageSnapshot.accessKeys,
      source: "admin_manual",
      startAt: baseStartAt,
      endAt: addDaysToIso(replacementBaseEndAt, resolvedInput.durationDays),
      status: "processed",
    });

    targetSubscriptionId = createdSubscription.id;
  }

  await fulfillSubscriptionAccessKeys({
    subscriptionId: targetSubscriptionId,
    userId: resolvedInput.userId,
    accessKeys: resolvedInput.packageSnapshot.accessKeys,
    manualAssignmentsByAccessKey: resolvedInput.manualAssignmentsByAccessKey,
  });

  await applySubscriptionStatus(targetSubscriptionId);

  const transaction = await createTransactionRow({
    code: toTransactionCode(),
    userId: resolvedInput.userId,
    subscriptionId: targetSubscriptionId,
    packageId: resolvedInput.packageSnapshot.packageId,
    packageName: resolvedInput.packageSnapshot.name,
    source: "admin_manual",
    status: "success",
    amountRp: resolvedInput.packageSnapshot.amountRp,
    paidAt: nowIso,
  });

  return {
    subscriptionId: targetSubscriptionId,
    transactionId: transaction.id,
    mode,
  };
}

export async function cancelSubscription(input: SubscriberCancelInput) {
  const parsedInput = subscriberCancelSchema.parse(input);
  const subscription = await getSubscriptionById(parsedInput.subscriptionId);

  if (!subscription) {
    throw new Error("Subscription not found.");
  }

  if (!["active", "processed"].includes(subscription.status)) {
    throw new Error("Only a running subscription can be canceled.");
  }

  await cancelSubscriptionRow({
    subscriptionId: parsedInput.subscriptionId,
    cancelReason: "admin_canceled",
  });
  await revokeActiveAssignmentsBySubscriptionId({
    subscriptionId: parsedInput.subscriptionId,
    revokeReason: "subscription_canceled",
  });

  return {
    subscriptionId: parsedInput.subscriptionId,
  };
}
