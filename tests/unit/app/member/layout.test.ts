import { createElement } from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: vi.fn(() => null),
}));

vi.mock("@/modules/users/services", () => ({
  requireMemberShellAccess: vi.fn(),
}));

import * as userServices from "@/modules/users/services";

import MemberLayout from "@/app/(member)/layout";

const mockedRequireMemberShellAccess = vi.mocked(userServices.requireMemberShellAccess);

describe("app/member/layout", () => {
  beforeEach(() => {
    mockedRequireMemberShellAccess.mockReset();
    mockedRequireMemberShellAccess.mockResolvedValue({
      profile: {
        email: "seed.none.browser@assetnext.dev",
        role: "member",
        username: "seed-none-browser",
      },
    } as never);
  });

  it("renders a route-agnostic member shell heading while preserving the member guard", async () => {
    const element = await MemberLayout({
      children: createElement("div", null, "member route body"),
    });

    expect(mockedRequireMemberShellAccess).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(element)).toContain("Kelola langganan akun");
    expect(JSON.stringify(element)).not.toContain(">Console<");
  });
});
