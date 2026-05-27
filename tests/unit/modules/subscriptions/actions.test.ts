import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/subscriptions/services", () => ({
  purchaseSubscriptionWithPaymentDummy: vi.fn(),
}));

vi.mock("@/modules/auth/action-client", () => ({
  adminActionClient: {
    metadata() {
      return this;
    },
    inputSchema() {
      return this;
    },
    action() {
      return async () => ({ data: null });
    },
  },
  memberActionClient: {
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
        const parsed = await import("@/modules/subscriptions/schemas").then(({ memberPaymentDummySchema }) =>
          memberPaymentDummySchema.safeParse(input),
        );

        if (!parsed.success) {
          return {
            validationErrors: {
              fieldErrors: parsed.error.flatten().fieldErrors,
            },
          };
        }

        const data = await handler({
          parsedInput: parsed.data,
          ctx: {
            currentAppUser: {
              profile: {
                userId: "member-user-id",
              },
            },
          },
        });

        return { data };
      };
    },
  },
}));

import { purchaseSubscriptionWithPaymentDummyAction } from "@/modules/subscriptions/actions";
import * as subscriptionServices from "@/modules/subscriptions/services";

const mockedPurchaseSubscriptionWithPaymentDummy = vi.mocked(subscriptionServices.purchaseSubscriptionWithPaymentDummy);

describe("subscriptions/actions", () => {
  beforeEach(() => {
    mockedPurchaseSubscriptionWithPaymentDummy.mockReset();
  });

  it("rejects invalid payment dummy payload before the service call", async () => {
    const result = await purchaseSubscriptionWithPaymentDummyAction({
      packageId: "not-a-uuid",
    });

    expect(result?.validationErrors?.fieldErrors.packageId).toContain("Package ID must be a valid UUID.");
    expect(mockedPurchaseSubscriptionWithPaymentDummy).not.toHaveBeenCalled();
  });

  it("returns the structured payment dummy result from the member service", async () => {
    mockedPurchaseSubscriptionWithPaymentDummy.mockResolvedValueOnce({
      ok: true,
      subscriptionId: "subscription-1",
      transactionId: "transaction-1",
      redirectTo: "/member",
    });

    const result = await purchaseSubscriptionWithPaymentDummyAction({
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });

    expect(mockedPurchaseSubscriptionWithPaymentDummy).toHaveBeenCalledWith({
      userId: "member-user-id",
      packageId: "f1c2183f-8f95-4db1-acf4-2d4d23e4c8f7",
    });
    expect(result?.data).toEqual({
      ok: true,
      subscriptionId: "subscription-1",
      transactionId: "transaction-1",
      redirectTo: "/member",
    });
  });
});
