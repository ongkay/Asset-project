import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/voucher",
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: () => ({
    executeAsync: async () => ({ data: { ok: true } }),
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: () => undefined,
    success: () => undefined,
  },
}));

import { AdminVoucherPage } from "@/app/(admin)/admin/voucher/_components/voucher-page";

describe("app/admin/voucher/voucher-page", () => {
  it("renders voucher stats, filters, and table content", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    });

    const markup = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AdminVoucherPage, {
          filters: {
            page: 1,
            pageSize: 10,
            scopeType: null,
            search: null,
            status: "all",
          },
          tableError: null,
          tablePage: {
            items: [
              {
                code: "VIP15",
                createdAt: "2026-05-21T00:00:00.000Z",
                createdBy: "11111111-1111-4111-8111-111111111111",
                discountPercent: 15,
                expiresAt: null,
                id: "voucher-1",
                isActive: true,
                maxUses: null,
                packageId: null,
                packageName: null,
                remainingUses: null,
                scopeType: "global",
                status: "active",
                updatedAt: "2026-05-21T00:00:00.000Z",
                usedCount: 0,
              },
            ],
            packageOptions: [
              {
                checkoutGroup: "full-private",
                isActive: true,
                name: "Full Private 15 days",
                packageId: "pkg-1",
              },
            ],
            page: 1,
            pageSize: 10,
            totalCount: 1,
          },
        }),
      ),
    );

    expect(markup).toContain("Total Vouchers");
    expect(markup).toContain("Add Voucher");
    expect(markup).toContain("Search voucher code");
    expect(markup).toContain("VIP15");
    expect(markup).toContain("Global");
  });
});
