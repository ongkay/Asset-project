import "server-only";

import { findCdKeyByCode, releaseReservedCdKeyUsage, reserveCdKeyUsage } from "./repositories";

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
