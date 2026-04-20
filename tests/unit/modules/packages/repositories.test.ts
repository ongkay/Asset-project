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

  it("sanitizes legacy access key payloads from admin package reads", async () => {
    databaseMocks.createInsForgeAdminDatabase.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "20000000-0000-0000-0000-000000000003",
                code: "PKG-1",
                name: "Legacy Package",
                amount_rp: 120000,
                duration_days: 30,
                checkout_url: null,
                is_extended: true,
                is_active: true,
                access_keys_json: ["invalid:key", 42, "tradingview:private"],
                created_at: "2026-04-01T00:00:00.000Z",
                updated_at: "2026-04-01T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { getPackageById } = await import("@/modules/packages/repositories");

    await expect(getPackageById("20000000-0000-0000-0000-000000000003")).resolves.toMatchObject({
      id: "20000000-0000-0000-0000-000000000003",
      accessKeys: ["tradingview:private"],
    });
  });
});
