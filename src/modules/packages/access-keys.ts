import { isPackageAccessKey, sortPackageAccessKeysCanonical, type PackageAccessKey } from "./types";

export function parsePackageAccessKeysFromReadPath(input: unknown): PackageAccessKey[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const validAccessKeys = input.filter(isPackageAccessKey);
  return sortPackageAccessKeysCanonical(validAccessKeys);
}
