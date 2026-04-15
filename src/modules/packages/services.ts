import "server-only";

import { randomUUID } from "node:crypto";

import { packageFormSchema, packageToggleSchema } from "./schemas";
import {
  countPackageTotalUsed,
  createPackageRow,
  getPackageById,
  getPackageSummary,
  togglePackageActiveRow,
  updatePackageRow,
} from "./repositories";
import type { PackageAdminRow, PackageFormInput, PackageRow, PackageSummary, PackageToggleInput } from "./types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected package service error.";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function isUniqueCodeConflict(error: unknown) {
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error).toLowerCase();

  if (errorCode !== "23505") {
    return false;
  }

  return errorMessage.includes("packages_code_unique") || errorMessage.includes("code");
}

function createPackageCodeCandidate(): string {
  return `PKG-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function generatePackageCode<T>(
  persistWithCode: (generatedCode: string) => Promise<T>,
): Promise<{ generatedCode: string; result: T }> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const generatedCode = createPackageCodeCandidate();

    try {
      const result = await persistWithCode(generatedCode);

      return {
        generatedCode,
        result,
      };
    } catch (error) {
      if (!isUniqueCodeConflict(error)) {
        throw new Error(getErrorMessage(error));
      }
    }
  }

  throw new Error("Failed to generate a unique package code.");
}

export async function derivePackageSummary(accessKeys: PackageFormInput["accessKeys"]): Promise<PackageSummary> {
  const summary = await getPackageSummary(accessKeys);

  if (!summary) {
    throw new Error("Package summary cannot be derived from access keys.");
  }

  return summary;
}

export async function buildPackageAdminRow(packageRow: PackageRow): Promise<PackageAdminRow> {
  const [summary, totalUsed] = await Promise.all([
    derivePackageSummary(packageRow.accessKeys),
    countPackageTotalUsed(packageRow.id),
  ]);

  return {
    accessKeys: packageRow.accessKeys,
    amountRp: packageRow.amountRp,
    checkoutUrl: packageRow.checkoutUrl,
    code: packageRow.code,
    createdAt: packageRow.createdAt,
    durationDays: packageRow.durationDays,
    id: packageRow.id,
    isActive: packageRow.isActive,
    isExtended: packageRow.isExtended,
    name: packageRow.name,
    summary,
    totalUsed,
    updatedAt: packageRow.updatedAt,
  };
}

export async function createPackage(input: PackageFormInput): Promise<PackageAdminRow> {
  const parsedInput = packageFormSchema.parse(input);
  const { result: createdRow } = await generatePackageCode((generatedCode) =>
    createPackageRow({
      ...parsedInput,
      code: generatedCode,
      isActive: true,
    }),
  );

  return buildPackageAdminRow(createdRow);
}

export async function updatePackage(input: { id: string } & PackageFormInput): Promise<PackageAdminRow> {
  const existingPackageRow = await getPackageById(input.id);

  if (!existingPackageRow) {
    throw new Error("Package not found.");
  }

  const parsedInput = packageFormSchema.parse(input);
  const updatedRow = await updatePackageRow({
    ...parsedInput,
    id: input.id,
  });

  return buildPackageAdminRow(updatedRow);
}

export async function togglePackageActive(input: PackageToggleInput): Promise<PackageAdminRow> {
  const parsedInput = packageToggleSchema.parse(input);
  const updatedRow = await togglePackageActiveRow(parsedInput);
  return buildPackageAdminRow(updatedRow);
}
