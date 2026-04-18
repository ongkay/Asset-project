import "server-only";

import { randomBytes } from "node:crypto";

import { getIssuablePackageSnapshotById } from "@/modules/packages/services";

import { cdKeyIssueInputSchema } from "./schemas";
import { createCdKeyRow, findCdKeyByCode, releaseReservedCdKeyUsage, reserveCdKeyUsage } from "./repositories";

import type { CdKeyIssueInput, CdKeyIssueRecord } from "./types";

const CDKEY_CREATE_FAILED_MESSAGE = "Failed to create CD-Key.";
const CDKEY_DUPLICATE_CODE_MESSAGE = "CD-Key code already exists.";
const CDKEY_GENERATION_EXHAUSTED_MESSAGE = "Failed to generate a unique CD-Key code.";

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
