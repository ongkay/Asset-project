import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  createInsForgeAdminDatabase: vi.fn(),
  createInsForgeServerDatabase: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  readValidatedInsForgeAccessTokenForActiveAppSession: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: databaseMocks.createInsForgeAdminDatabase,
  createInsForgeServerDatabase: databaseMocks.createInsForgeServerDatabase,
}));

vi.mock("@/modules/auth/services", () => ({
  readValidatedInsForgeAccessTokenForActiveAppSession:
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession,
}));

describe("packages/repositories member read path", () => {
  beforeEach(() => {
    databaseMocks.createInsForgeAdminDatabase.mockReset();
    databaseMocks.createInsForgeServerDatabase.mockReset();
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockReset();
  });

  it("returns an empty package list when the member token is unavailable", async () => {
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue(null);

    const { listActivePackageRowsForMember } = await import("@/modules/packages/repositories");

    await expect(listActivePackageRowsForMember()).resolves.toEqual([]);
    expect(databaseMocks.createInsForgeServerDatabase).not.toHaveBeenCalled();
  });

  it("returns null for package-by-id when the member token is unavailable", async () => {
    authServiceMocks.readValidatedInsForgeAccessTokenForActiveAppSession.mockResolvedValue(null);

    const { getActivePackageRowByIdForMember } = await import("@/modules/packages/repositories");

    await expect(getActivePackageRowByIdForMember("11111111-1111-4111-8111-111111111111")).resolves.toBeNull();
    expect(databaseMocks.createInsForgeServerDatabase).not.toHaveBeenCalled();
  });
});
