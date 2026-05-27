import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/console/schemas", () => ({
  parseConsolePaymentErrorSearchParam: vi.fn(),
}));

import * as consoleSchemas from "@/modules/console/schemas";

import MemberConsoleRoutePage from "@/app/(member)/console/page";

const mockedParseConsolePaymentErrorSearchParam = vi.mocked(consoleSchemas.parseConsolePaymentErrorSearchParam);

describe("app/member/console/page", () => {
  beforeEach(() => {
    vi.mocked(navigationMocks.redirect).mockClear();
    mockedParseConsolePaymentErrorSearchParam.mockReset();
  });

  it("redirects the legacy console route to /member while preserving paymentError", async () => {
    mockedParseConsolePaymentErrorSearchParam.mockReturnValueOnce("disabled-package");

    await expect(
      MemberConsoleRoutePage({
        searchParams: Promise.resolve({ paymentError: "disabled-package" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/member?paymentError=disabled-package");

    expect(mockedParseConsolePaymentErrorSearchParam).toHaveBeenCalledWith({ paymentError: "disabled-package" });
  });

  it("redirects the legacy console route to /member without extra params when there is no paymentError", async () => {
    mockedParseConsolePaymentErrorSearchParam.mockReturnValueOnce(null);

    await expect(
      MemberConsoleRoutePage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/member");
  });
});
