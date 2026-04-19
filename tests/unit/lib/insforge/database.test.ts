import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  readInsForgeAccessTokenCookie: vi.fn(),
}));

const clientMocks = vi.hoisted(() => ({
  createInsForgeAdminClient: vi.fn(),
  createInsForgeServerClient: vi.fn(),
}));

vi.mock("@/lib/cookies", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cookies")>("@/lib/cookies");

  return {
    ...actual,
    readInsForgeAccessTokenCookie: cookieMocks.readInsForgeAccessTokenCookie,
  };
});

vi.mock("@/lib/insforge/admin-client", () => ({
  createInsForgeAdminClient: clientMocks.createInsForgeAdminClient,
}));

vi.mock("@/lib/insforge/server-client", () => ({
  createInsForgeServerClient: clientMocks.createInsForgeServerClient,
}));

describe("createAuthenticatedInsForgeServerDatabase", () => {
  beforeEach(() => {
    cookieMocks.readInsForgeAccessTokenCookie.mockReset();
    clientMocks.createInsForgeAdminClient.mockReset();
    clientMocks.createInsForgeServerClient.mockReset();
  });

  it("builds the server database with the session access token", async () => {
    cookieMocks.readInsForgeAccessTokenCookie.mockResolvedValue("member-access-token");
    clientMocks.createInsForgeServerClient.mockReturnValue({
      database: { tag: "member-db" },
    });

    const { createAuthenticatedInsForgeServerDatabase } = await import("@/lib/insforge/database");

    await expect(createAuthenticatedInsForgeServerDatabase()).resolves.toEqual({ tag: "member-db" });
    expect(clientMocks.createInsForgeServerClient).toHaveBeenCalledWith({ accessToken: "member-access-token" });
  });

  it("rejects when the login runtime has no persisted InsForge access token", async () => {
    cookieMocks.readInsForgeAccessTokenCookie.mockResolvedValue(undefined);

    const { createAuthenticatedInsForgeServerDatabase } = await import("@/lib/insforge/database");

    await expect(createAuthenticatedInsForgeServerDatabase()).rejects.toThrow(
      "An authenticated InsForge access token is required.",
    );
  });
});
