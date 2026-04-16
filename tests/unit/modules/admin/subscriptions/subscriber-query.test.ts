import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/subscriptions/actions", () => ({
  getSubscriberActivationDraftAction: vi.fn(),
  getSubscriberEditorDataAction: vi.fn(),
  getSubscriberTablePageAction: vi.fn(),
  searchSubscriberUsersAction: vi.fn(),
}));

import * as adminSubscriptionActions from "@/modules/admin/subscriptions/actions";
import {
  fetchSubscriberActivationDraft,
  fetchSubscriberTablePage,
} from "@/app/(admin)/admin/subscriber/_components/subscriber-query";

const mockedGetSubscriberActivationDraftAction = vi.mocked(adminSubscriptionActions.getSubscriberActivationDraftAction);
const mockedGetSubscriberTablePageAction = vi.mocked(adminSubscriptionActions.getSubscriberTablePageAction);

describe("admin/subscriptions/subscriber-query", () => {
  beforeEach(() => {
    mockedGetSubscriberActivationDraftAction.mockReset();
    mockedGetSubscriberTablePageAction.mockReset();
  });

  it("unwraps a successful subscriber table payload", async () => {
    mockedGetSubscriberTablePageAction.mockResolvedValueOnce({
      data: {
        ok: true,
        tablePage: {
          items: [],
          page: 1,
          pageSize: 10,
          totalCount: 0,
        },
      },
    } as never);

    await expect(
      fetchSubscriberTablePage({
        search: null,
        assetType: null,
        status: null,
        expiresFrom: null,
        expiresTo: null,
        page: 1,
        pageSize: 10,
      }),
    ).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("throws the best available error message for failed draft reads", async () => {
    mockedGetSubscriberActivationDraftAction.mockResolvedValueOnce({
      validationErrors: {
        formErrors: ["Package ID is required."],
      },
      data: {
        ok: false,
        message: "Failed to load activation draft.",
      },
    } as never);

    await expect(
      fetchSubscriberActivationDraft({
        userId: "user-1",
        packageId: "package-1",
        subscriptionId: null,
      }),
    ).rejects.toThrow("Package ID is required.");
  });
});
