import "server-only";

import { createAsset } from "@/modules/assets/services";
import { parseAssetJsonText } from "@/modules/assets/schemas";
import type { PackageAccessKey } from "@/modules/packages/types";
import {
  getMemberPurchasablePackageById,
  getPackageById as getPackageByIdFromPackages,
  toPackageActivationSnapshot,
} from "@/modules/packages/services";
import {
  attachTransactionToSubscription,
  createTransaction,
  failTransaction,
  succeedTransaction,
} from "@/modules/transactions/services";

import {
  adminManualActivationFormSchema,
  memberPaymentDummySchema,
  subscriberCancelSchema,
  subscriberQuickAddAssetSchema,
} from "./schemas";
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
  listCurrentAssignmentsBySubscriptionId,
  revokeActiveAssignmentsBySubscriptionId,
  restoreSubscriptionRow,
  updateSubscriptionWindow,
} from "./repositories";

import type {
  AdminManualActivationFormValues,
  AdminManualActivationInput,
  MemberPaymentDummyInput,
  MemberPaymentDummyResult,
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

const PAYMENT_DUMMY_INVALID_PACKAGE_MESSAGE = "Package yang dipilih tidak valid atau sudah tidak tersedia.";
const PAYMENT_DUMMY_DISABLED_PACKAGE_MESSAGE = "Package sudah tidak tersedia untuk pembelian baru.";
const PAYMENT_DUMMY_FAILED_MESSAGE = "Pembayaran dummy gagal diproses. Silakan coba lagi.";

type ActivationCompensation = {
  rollback: () => Promise<void>;
};

type ActivationExecutionResult = {
  compensation: ActivationCompensation;
  result: SubscriptionActivationResult;
};

function assertPackageSnapshotHasAccessKeys(packageSnapshot: SubscriptionPackageSnapshot) {
  if (packageSnapshot.accessKeys.length === 0) {
    throw new Error("Package access keys are invalid.");
  }
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
    source: "admin_manual",
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

function getReplacementCancelReason(source: AdminManualActivationInput["source"]) {
  if (source === "payment_dummy") {
    return "replaced_by_payment_dummy";
  }

  if (source === "cdkey") {
    return "replaced_by_cdkey";
  }

  return "replaced_by_admin_manual";
}

function getCompensationCancelReason(source: AdminManualActivationInput["source"]) {
  if (source === "payment_dummy") {
    return "payment_dummy_compensation";
  }

  if (source === "cdkey") {
    return "cdkey_compensation";
  }

  return "admin_manual_compensation";
}

async function restoreAssignmentsForSubscription(input: {
  assignments: Awaited<ReturnType<typeof listCurrentAssignmentsBySubscriptionId>>;
  subscriptionId: string;
  userId: string;
}) {
  for (const assignment of input.assignments) {
    if (!assignment.assetId) {
      continue;
    }

    await insertManualAssignmentRow({
      subscriptionId: input.subscriptionId,
      userId: input.userId,
      accessKey: assignment.accessKey,
      assetId: assignment.assetId,
    });
  }
}

async function tryFinalizeFailureWithoutMasking(input: { failureReason: string; transactionId: string }) {
  try {
    await failTransaction(input);
  } catch {
    return;
  }
}

async function tryRollbackWithoutMasking(compensation: ActivationCompensation) {
  try {
    await compensation.rollback();
  } catch {
    return;
  }
}

export async function activateSubscriptionWithCompensation(
  input: AdminManualActivationInput,
): Promise<ActivationExecutionResult> {
  assertPackageSnapshotHasAccessKeys(input.packageSnapshot);

  const nowIso = new Date().toISOString();
  const runningSubscription = await getRunningSubscriptionByUserId(input.userId);
  const mode = getReplacementMode({
    runningSubscription,
    packageSnapshot: input.packageSnapshot,
  });

  if (mode === "extend-existing") {
    const previousEndAt = runningSubscription!.endAt;
    const previousStatus = runningSubscription!.status;
    const previousAssignments = await listCurrentAssignmentsBySubscriptionId(runningSubscription!.id);
    const compensation: ActivationCompensation = {
      rollback: async () => {
        await revokeActiveAssignmentsBySubscriptionId({
          subscriptionId: runningSubscription!.id,
          revokeReason: "subscription_compensation",
        });
        await restoreSubscriptionRow({
          subscriptionId: runningSubscription!.id,
          status: previousStatus,
          endAt: previousEndAt,
        });
        await restoreAssignmentsForSubscription({
          assignments: previousAssignments,
          subscriptionId: runningSubscription!.id,
          userId: input.userId,
        });
      },
    };

    try {
      await updateSubscriptionWindow({
        subscriptionId: runningSubscription!.id,
        endAt: addDaysToIso(runningSubscription!.endAt, input.durationDays),
      });

      await fulfillSubscriptionAccessKeys({
        subscriptionId: runningSubscription!.id,
        userId: input.userId,
        accessKeys: input.packageSnapshot.accessKeys,
        manualAssignmentsByAccessKey: input.manualAssignmentsByAccessKey,
      });

      await applySubscriptionStatus(runningSubscription!.id);

      return {
        result: {
          subscriptionId: runningSubscription!.id,
          mode,
        },
        compensation,
      };
    } catch (error) {
      await tryRollbackWithoutMasking(compensation);
      throw error;
    }
  }

  const previousAssignments = runningSubscription
    ? await listCurrentAssignmentsBySubscriptionId(runningSubscription.id)
    : [];
  let createdSubscriptionId: string | null = null;
  const compensation: ActivationCompensation = {
    rollback: async () => {
      if (createdSubscriptionId) {
        await revokeActiveAssignmentsBySubscriptionId({
          subscriptionId: createdSubscriptionId,
          revokeReason: "subscription_compensation",
        });
        await cancelSubscriptionRow({
          subscriptionId: createdSubscriptionId,
          cancelReason: getCompensationCancelReason(input.source),
        });
      }

      if (!runningSubscription) {
        return;
      }

      await restoreSubscriptionRow({
        subscriptionId: runningSubscription.id,
        status: runningSubscription.status,
        endAt: runningSubscription.endAt,
      });
      await restoreAssignmentsForSubscription({
        assignments: previousAssignments,
        subscriptionId: runningSubscription.id,
        userId: input.userId,
      });
    },
  };

  try {
    if (runningSubscription) {
      await cancelSubscriptionRow({
        subscriptionId: runningSubscription.id,
        cancelReason: getReplacementCancelReason(input.source),
      });
      await revokeActiveAssignmentsBySubscriptionId({
        subscriptionId: runningSubscription.id,
        revokeReason: "subscription_replaced",
      });
    }

    const replacementBaseEndAt =
      mode === "replace-with-carry-over" && runningSubscription
        ? new Date(Math.max(new Date(runningSubscription.endAt).getTime(), new Date(nowIso).getTime())).toISOString()
        : nowIso;

    const createdSubscription = await createSubscriptionWithSnapshot({
      userId: input.userId,
      packageId: input.packageSnapshot.packageId,
      packageName: input.packageSnapshot.name,
      accessKeys: input.packageSnapshot.accessKeys,
      source: input.source,
      startAt: nowIso,
      endAt: addDaysToIso(replacementBaseEndAt, input.durationDays),
      status: "processed",
    });
    createdSubscriptionId = createdSubscription.id;

    await fulfillSubscriptionAccessKeys({
      subscriptionId: createdSubscription.id,
      userId: input.userId,
      accessKeys: input.packageSnapshot.accessKeys,
      manualAssignmentsByAccessKey: input.manualAssignmentsByAccessKey,
    });

    await applySubscriptionStatus(createdSubscription.id);

    return {
      result: {
        subscriptionId: createdSubscription.id,
        mode,
      },
      compensation,
    };
  } catch (error) {
    await tryRollbackWithoutMasking(compensation);
    throw error;
  }
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
  const accessKey = `${parsedInput.platform}:private` as PackageAccessKey;

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

export async function activateSubscription(input: AdminManualActivationInput): Promise<SubscriptionActivationResult> {
  const activationExecution = await activateSubscriptionWithCompensation(input);
  return activationExecution.result;
}

export async function activateSubscriptionManually(
  input: AdminManualActivationInput | AdminManualActivationFormValues,
): Promise<SubscriptionActivationResult & { transactionId: string }> {
  const resolvedInput = await resolveActivationInput(input);

  if (resolvedInput.packageSnapshot.isActive === false) {
    throw new Error("Package is disabled.");
  }

  const activationResult = await activateSubscription({
    ...resolvedInput,
    source: "admin_manual",
  });

  const nowIso = new Date().toISOString();

  const transaction = await createTransactionRow({
    code: toTransactionCode(),
    userId: resolvedInput.userId,
    subscriptionId: activationResult.subscriptionId,
    packageId: resolvedInput.packageSnapshot.packageId,
    packageName: resolvedInput.packageSnapshot.name,
    source: "admin_manual",
    status: "success",
    amountRp: resolvedInput.packageSnapshot.amountRp,
    paidAt: nowIso,
  });

  return {
    subscriptionId: activationResult.subscriptionId,
    transactionId: transaction.id,
    mode: activationResult.mode,
  };
}

function getFailureReason(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected checkout error.";
}

export async function purchaseSubscriptionWithPaymentDummy(
  input: MemberPaymentDummyInput,
): Promise<MemberPaymentDummyResult> {
  const parsedInput = memberPaymentDummySchema.parse({ packageId: input.packageId });
  const activePackage = await getMemberPurchasablePackageById(parsedInput.packageId);

  if (!activePackage) {
    const packageRow = await getPackageByIdFromPackages(parsedInput.packageId);

    return packageRow
      ? {
          ok: false,
          errorCode: "disabled-package",
          message: PAYMENT_DUMMY_DISABLED_PACKAGE_MESSAGE,
        }
      : {
          ok: false,
          errorCode: "invalid-package",
          message: PAYMENT_DUMMY_INVALID_PACKAGE_MESSAGE,
        };
  }

  const transaction = await createTransaction({
    userId: input.userId,
    source: "payment_dummy",
    packageSnapshot: {
      packageId: activePackage.packageId,
      name: activePackage.name,
      amountRp: activePackage.amountRp,
    },
  });

  let activationExecution: ActivationExecutionResult | null = null;

  try {
    activationExecution = await activateSubscriptionWithCompensation({
      userId: input.userId,
      packageSnapshot: toPackageActivationSnapshot(activePackage),
      durationDays: activePackage.durationDays,
      manualAssignmentsByAccessKey: {},
      source: "payment_dummy",
    });
    const activationResult = activationExecution.result;

    await attachTransactionToSubscription(transaction.id, activationResult.subscriptionId);
    await succeedTransaction(transaction.id);

    return {
      ok: true,
      subscriptionId: activationResult.subscriptionId,
      transactionId: transaction.id,
      redirectTo: "/console",
    };
  } catch (error) {
    if (activationExecution) {
      await tryRollbackWithoutMasking(activationExecution.compensation);
    }

    await tryFinalizeFailureWithoutMasking({
      transactionId: transaction.id,
      failureReason: getFailureReason(error),
    });

    return {
      ok: false,
      errorCode: "checkout-failed",
      message: PAYMENT_DUMMY_FAILED_MESSAGE,
    };
  }
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
