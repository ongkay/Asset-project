import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    profile: {
      role: "admin",
      userId: "admin-user-id",
    },
  }),
}));

vi.mock("@/modules/cdkeys/services", () => ({
  createCdKey: vi.fn(),
}));

vi.mock("@/modules/auth/action-client", () => ({
  adminActionClient: {
    metadata() {
      return this;
    },
    inputSchema() {
      return this;
    },
    action(
      handler: (args: {
        parsedInput: {
          packageId: string;
          manualCode: string | null;
          amountRpOverride: number | null;
        };
        ctx: {
          currentAppUser: {
            profile: {
              userId: string;
            };
          };
        };
      }) => Promise<unknown>,
    ) {
      return async (input: unknown) => {
        const parsed = await import("@/modules/cdkeys/schemas").then(({ cdKeyIssueInputSchema }) =>
          cdKeyIssueInputSchema.safeParse(input),
        );

        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          return {
            validationErrors: {
              fieldErrors,
            },
          };
        }

        const data = await handler({
          parsedInput: parsed.data,
          ctx: {
            currentAppUser: {
              profile: {
                userId: "admin-user-id",
              },
            },
          },
        });

        return { data };
      };
    },
  },
}));

import * as cdKeyServices from "@/modules/cdkeys/services";
import { createCdKeyAction } from "@/modules/cdkeys/actions";

const mockedCreateCdKey = vi.mocked(cdKeyServices.createCdKey);

describe("cdkeys/actions", () => {
  beforeEach(() => {
    mockedCreateCdKey.mockReset();
  });

  it("rejects invalid payload before service call", async () => {
    const result = await createCdKeyAction({
      packageId: "not-a-uuid",
      manualCode: "ab12-c",
      amountRpOverride: -1,
    });

    expect(result?.validationErrors?.fieldErrors.packageId).toContain("Package ID must be a valid UUID.");
    expect(result?.validationErrors?.fieldErrors.manualCode).toContain(
      "Manual code length must be between 8 and 12 characters.",
    );
    expect(result?.validationErrors?.fieldErrors.amountRpOverride).toContain(
      "Amount override must be greater than or equal to 0.",
    );
    expect(mockedCreateCdKey).not.toHaveBeenCalled();
  });

  it("returns success payload when service succeeds", async () => {
    mockedCreateCdKey.mockResolvedValueOnce({
      id: "cdkey-1",
      code: "AB12CD34EF",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      amountRp: 150000,
      durationDays: 30,
      isExtended: true,
      accessKeys: ["tradingview:private"],
      isActive: true,
      usedBy: null,
      usedAt: null,
      createdBy: "admin-user-id",
    });

    const result = await createCdKeyAction({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: "ab12-cd34",
      amountRpOverride: null,
    });

    expect(mockedCreateCdKey).toHaveBeenCalledWith(
      {
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        manualCode: "AB12CD34",
        amountRpOverride: null,
      },
      "admin-user-id",
    );
    expect(result?.data).toEqual({
      ok: true,
      row: {
        id: "cdkey-1",
        code: "AB12CD34EF",
        packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
        amountRp: 150000,
        durationDays: 30,
        isExtended: true,
        accessKeys: ["tradingview:private"],
        isActive: true,
        usedBy: null,
        usedAt: null,
        createdBy: "admin-user-id",
      },
    });
  });

  it("returns stable failure payload when service throws", async () => {
    mockedCreateCdKey.mockRejectedValueOnce(new Error("Package is disabled."));

    const result = await createCdKeyAction({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
      manualCode: null,
      amountRpOverride: null,
    });

    expect(result?.data).toEqual({
      ok: false,
      message: "Package is disabled.",
    });
  });
});
