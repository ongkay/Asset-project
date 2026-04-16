import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/users/services", () => ({
  getAuthenticatedAppUser: vi.fn().mockResolvedValue({
    id: "admin-user-id",
    profile: {
      role: "admin",
    },
  }),
}));

vi.mock("@/modules/admin/subscriptions/queries", () => ({
  getSubscriberActivationDraft: vi.fn(),
  getSubscriberEditorData: vi.fn(),
  getSubscriberTablePage: vi.fn(),
  searchSubscriberUsers: vi.fn(),
}));

import * as adminSubscriptionQueries from "@/modules/admin/subscriptions/queries";
import { getSubscriberTablePageAction } from "@/modules/admin/subscriptions/actions";

const mockedGetSubscriberTablePage = vi.mocked(adminSubscriptionQueries.getSubscriberTablePage);

describe("admin/subscriptions/actions", () => {
  beforeEach(() => {
    mockedGetSubscriberTablePage.mockReset();
  });

  it("rejects reversed expiry ranges before query execution", async () => {
    const result = await getSubscriberTablePageAction({
      search: null,
      assetType: null,
      status: null,
      expiresFrom: "2026-04-20",
      expiresTo: "2026-04-10",
      page: 1,
      pageSize: 10,
    });

    expect(result?.validationErrors?.fieldErrors.expiresTo).toContain(
      "Expiry start date cannot be later than expiry end date.",
    );
    expect(mockedGetSubscriberTablePage).not.toHaveBeenCalled();
  });
});
