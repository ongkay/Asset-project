import "server-only";

import { randomBytes } from "node:crypto";

import { getIssuablePackageSnapshotById } from "@/modules/packages/services";
import { activateSubscriptionWithCompensation } from "@/modules/subscriptions/services";
import {
  attachTransactionToSubscription,
  createTransaction,
  failTransaction,
  succeedTransaction,
} from "@/modules/transactions/services";

import { cdKeyIssueInputSchema, redeemCdKeySchema } from "./schemas";
import { createCdKeyRow, findCdKeyByCode, releaseReservedCdKeyUsage, reserveCdKeyUsage } from "./repositories";

import type { CdKeyIssueInput, CdKeyIssueRecord, RedeemCdKeyResult, RedeemCdKeyServiceInput } from "./types";

const CDKEY_CREATE_FAILED_MESSAGE = "Failed to create CD-Key.";
const CDKEY_DUPLICATE_CODE_MESSAGE = "CD-Key code already exists.";
const CDKEY_GENERATION_EXHAUSTED_MESSAGE = "Failed to generate a unique CD-Key code.";
const REDEEM_INVALID_MESSAGE = "CD-Key tidak valid atau sudah terpakai.";
const REDEEM_FAILED_MESSAGE = "Redeem CD-Key gagal diproses. Silakan coba lagi.";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected CD-Key service error.";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function getErrorConstraint(error: unknown) {
  if (error && typeof error === "object" && "constraint" in error && typeof error.constraint === "string") {
    return error.constraint;
  }

  return null;
}

function isUniqueCdKeyCodeConflict(error: unknown) {
  if (getErrorCode(error) !== "23505") {
    return false;
  }

  const constraintName = getErrorConstraint(error)?.toLowerCase();

  if (constraintName && constraintName.includes("cd_keys_code")) {
    return true;
  }

  const errorMessage = getErrorMessage(error).toLowerCase();
  return errorMessage.includes("cd_keys_code") || (errorMessage.includes("cd_keys") && errorMessage.includes("code"));
}

export function generateCdKeyCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const codeLength = 10;
  const bytes = randomBytes(codeLength);
  let generatedCode = "";

  for (let index = 0; index < codeLength; index += 1) {
    const nextCharacterIndex = bytes[index] % alphabet.length;
    generatedCode += alphabet[nextCharacterIndex];
  }

  return generatedCode;
}

async function createCdKeyWithRetries(input: {
  amountRp: number;
  codeGenerator: () => string;
  createdBy: string;
  durationDays: number;
  isExtended: boolean;
  packageId: string;
  accessKeys: CdKeyIssueRecord["accessKeys"];
}): Promise<CdKeyIssueRecord> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await createCdKeyRow({
        code: input.codeGenerator(),
        packageId: input.packageId,
        durationDays: input.durationDays,
        isExtended: input.isExtended,
        accessKeys: input.accessKeys,
        amountRp: input.amountRp,
        createdBy: input.createdBy,
      });
    } catch (error) {
      if (!isUniqueCdKeyCodeConflict(error)) {
        throw new Error(CDKEY_CREATE_FAILED_MESSAGE);
      }
    }
  }

  throw new Error(CDKEY_GENERATION_EXHAUSTED_MESSAGE);
}

export async function createCdKey(
  input: CdKeyIssueInput,
  createdBy: string,
  codeGenerator: () => string = generateCdKeyCode,
): Promise<CdKeyIssueRecord> {
  const parsedInput = cdKeyIssueInputSchema.parse(input);
  const packageSnapshot = await getIssuablePackageSnapshotById(parsedInput.packageId);
  const amountRp = parsedInput.amountRpOverride ?? packageSnapshot.amountRp;

  if (parsedInput.manualCode) {
    try {
      return await createCdKeyRow({
        code: parsedInput.manualCode,
        packageId: packageSnapshot.id,
        durationDays: packageSnapshot.durationDays,
        isExtended: packageSnapshot.isExtended,
        accessKeys: packageSnapshot.accessKeys,
        amountRp,
        createdBy,
      });
    } catch (error) {
      if (isUniqueCdKeyCodeConflict(error)) {
        throw new Error(CDKEY_DUPLICATE_CODE_MESSAGE);
      }

      throw new Error(CDKEY_CREATE_FAILED_MESSAGE);
    }
  }

  return createCdKeyWithRetries({
    packageId: packageSnapshot.id,
    durationDays: packageSnapshot.durationDays,
    isExtended: packageSnapshot.isExtended,
    accessKeys: packageSnapshot.accessKeys,
    amountRp,
    createdBy,
    codeGenerator,
  });
}

export async function getCdKeyActivationSnapshot(code: string) {
  return findCdKeyByCode(code);
}

export async function consumeCdKey(cdKeyId: string, userId: string) {
  const reservedAt = await reserveCdKeyUsage(cdKeyId, userId);

  if (!reservedAt) {
    throw new Error("CD-Key is no longer available for activation.");
  }

  return {
    reservedAt,
  };
}

export async function rollbackConsumedCdKey(input: { cdKeyId: string; reservedAt: string; userId: string }) {
  await releaseReservedCdKeyUsage(input);
}

function getRedeemFailureReason(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected redeem error.";
}

async function getReservationRaceResult(code: string): Promise<RedeemCdKeyResult> {
  const latestSnapshot = await findCdKeyByCode(code);

  if (!latestSnapshot || latestSnapshot.isActive === false) {
    return {
      ok: false,
      errorCode: "code-invalid",
      message: REDEEM_INVALID_MESSAGE,
    };
  }

  return {
    ok: false,
    errorCode: latestSnapshot.usedAt || latestSnapshot.usedBy ? "code-used" : "code-invalid",
    message: REDEEM_INVALID_MESSAGE,
  };
}

async function tryFinalizeRedeemFailureWithoutMasking(input: { failureReason: string; transactionId: string }) {
  try {
    await failTransaction(input);
  } catch {
    return;
  }
}

export async function redeemCdKey(input: RedeemCdKeyServiceInput): Promise<RedeemCdKeyResult> {
  const parsedInput = redeemCdKeySchema.parse({ code: input.code });
  const cdKeySnapshot = await findCdKeyByCode(parsedInput.code);

  if (!cdKeySnapshot || cdKeySnapshot.isActive === false) {
    return {
      ok: false,
      errorCode: "code-invalid",
      message: REDEEM_INVALID_MESSAGE,
    };
  }

  if (cdKeySnapshot.usedAt || cdKeySnapshot.usedBy) {
    return {
      ok: false,
      errorCode: "code-used",
      message: REDEEM_INVALID_MESSAGE,
    };
  }

  const reservedAt = await reserveCdKeyUsage(cdKeySnapshot.id, input.userId);

  if (!reservedAt) {
    return getReservationRaceResult(parsedInput.code);
  }

  let transactionId: string | null = null;
  let activationExecution: Awaited<ReturnType<typeof activateSubscriptionWithCompensation>> | null = null;

  try {
    const transaction = await createTransaction({
      userId: input.userId,
      source: "cdkey",
      cdKeyId: cdKeySnapshot.id,
      packageSnapshot: {
        packageId: cdKeySnapshot.packageSnapshot.packageId,
        name: cdKeySnapshot.packageSnapshot.name,
        amountRp: cdKeySnapshot.packageSnapshot.amountRp,
      },
    });
    transactionId = transaction.id;

    activationExecution = await activateSubscriptionWithCompensation({
      userId: input.userId,
      packageSnapshot: cdKeySnapshot.packageSnapshot,
      durationDays: cdKeySnapshot.packageSnapshot.durationDays,
      manualAssignmentsByAccessKey: {},
      source: "cdkey",
    });
    const activationResult = activationExecution.result;

    await attachTransactionToSubscription(transaction.id, activationResult.subscriptionId);
    await succeedTransaction(transaction.id);

    return {
      ok: true,
      subscriptionId: activationResult.subscriptionId,
      transactionId: transaction.id,
    };
  } catch (error) {
    let canReleaseReservation = true;

    if (activationExecution) {
      try {
        await activationExecution.compensation.rollback();
      } catch {
        canReleaseReservation = false;
      }
    }

    if (canReleaseReservation) {
      await rollbackConsumedCdKey({
        cdKeyId: cdKeySnapshot.id,
        reservedAt,
        userId: input.userId,
      });
    }

    if (transactionId) {
      await tryFinalizeRedeemFailureWithoutMasking({
        transactionId,
        failureReason: getRedeemFailureReason(error),
      });
    }

    return {
      ok: false,
      errorCode: "redeem-failed",
      message: REDEEM_FAILED_MESSAGE,
    };
  }
}
