import { describe, expect, it } from "vitest";

import { adminCreateUserSchema, adminEditUserProfileSchema, adminToggleUserBanSchema } from "@/modules/users/schemas";

describe("users/schemas", () => {
  it("normalizes create-user email and requires matching passwords", () => {
    const result = adminCreateUserSchema.parse({
      email: "  New.Member+Trial@AssetNext.dev ",
      password: "Devpass123",
      confirmPassword: "Devpass123",
      role: "member",
    });

    expect(result.email).toBe("new.member+trial@assetnext.dev");
  });

  it("rejects profile edits outside the explicit allowlist", () => {
    const result = adminEditUserProfileSchema.safeParse({
      userId: "91000000-0000-4000-8000-000000000002",
      username: "seed-active-browser",
      avatarUrl: null,
      email: "should-not-be-editable@assetnext.dev",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("supports clearing avatar_url back to null", () => {
    const result = adminEditUserProfileSchema.parse({
      userId: "91000000-0000-4000-8000-000000000002",
      username: "seed-active-browser",
      avatarUrl: "   ",
    });

    expect(result.avatarUrl).toBeNull();
  });

  it("rejects usernames that do not match the generated username rules", () => {
    const result = adminEditUserProfileSchema.safeParse({
      userId: "91000000-0000-4000-8000-000000000002",
      username: "Seed Active Browser",
      avatarUrl: null,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.username).toContain(
      "Username may only use lowercase letters, numbers, and single hyphens.",
    );
  });

  it("parses the ban toggle contract", () => {
    const result = adminToggleUserBanSchema.parse({
      userId: "91000000-0000-4000-8000-000000000002",
      nextIsBanned: true,
      banReason: null,
    });

    expect(result).toEqual({
      userId: "91000000-0000-4000-8000-000000000002",
      nextIsBanned: true,
      banReason: null,
    });
  });
});
