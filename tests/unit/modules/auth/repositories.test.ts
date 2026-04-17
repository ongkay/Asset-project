import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedCreateInsForgeAdminDatabase, mockedRpc } = vi.hoisted(() => ({
  mockedCreateInsForgeAdminDatabase: vi.fn(),
  mockedRpc: vi.fn(),
}));

vi.mock("@/config/env.server", () => ({
  env: {
    INSFORGE_PROJECT_ADMIN_EMAIL: "admin@assetnext.dev",
  },
}));

vi.mock("@/lib/insforge/admin-client", () => ({
  createInsForgeAdminClient: vi.fn(),
}));

vi.mock("@/lib/insforge/auth", () => ({
  createInsForgeServerAuth: vi.fn(),
}));

vi.mock("@/lib/insforge/database", () => ({
  createInsForgeAdminDatabase: mockedCreateInsForgeAdminDatabase,
  createInsForgeServerDatabase: vi.fn(),
}));

import {
  createAuthUserAsAdmin,
  deleteAuthUserAsAdmin,
  readAuthUserByEmail,
  updateAuthUserPasswordAsAdmin,
} from "@/modules/auth/repositories";

describe("auth/repositories", () => {
  beforeEach(() => {
    mockedRpc.mockReset();
    mockedCreateInsForgeAdminDatabase.mockReset();

    mockedCreateInsForgeAdminDatabase.mockReturnValue({
      rpc: mockedRpc,
    });
  });

  it("performs exact auth email lookup via the dedicated RPC", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: {
        email: "target@assetnext.dev",
        email_verified: true,
        id: "auth-user-1",
      },
      error: null,
    });

    await expect(readAuthUserByEmail({ email: "target@assetnext.dev" })).resolves.toEqual({
      email: "target@assetnext.dev",
      emailVerified: true,
      id: "auth-user-1",
    });

    expect(mockedRpc).toHaveBeenCalledWith("get_auth_user_by_email", {
      p_email: "target@assetnext.dev",
    });
  });

  it("creates admin-managed auth users via RPC instead of shaping auth.users rows in app code", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: {
        email: "new.member@assetnext.dev",
        email_verified: true,
        id: "new-auth-user",
      },
      error: null,
    });

    await expect(
      createAuthUserAsAdmin({
        email: "new.member@assetnext.dev",
        password: "Devpass123",
      }),
    ).resolves.toEqual({
      email: "new.member@assetnext.dev",
      emailVerified: true,
      id: "new-auth-user",
    });

    expect(mockedRpc).toHaveBeenCalledWith("admin_create_auth_user", {
      p_email: "new.member@assetnext.dev",
      p_password: "Devpass123",
    });
  });

  it("fails clearly when the target auth identity does not exist during password update", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      updateAuthUserPasswordAsAdmin({
        newPassword: "Devpass123",
        userId: "91000000-0000-4000-8000-000000000002",
      }),
    ).rejects.toThrow("Auth user not found.");

    expect(mockedRpc).toHaveBeenCalledWith("admin_update_auth_user_password", {
      p_new_password: "Devpass123",
      p_user_id: "91000000-0000-4000-8000-000000000002",
    });
  });

  it("deletes orphaned auth users via compensation RPC", async () => {
    mockedRpc.mockResolvedValueOnce({
      data: true,
      error: null,
    });

    await expect(deleteAuthUserAsAdmin({ userId: "new-auth-user" })).resolves.toBeUndefined();

    expect(mockedRpc).toHaveBeenCalledWith("admin_delete_auth_user", {
      p_user_id: "new-auth-user",
    });
  });
});
