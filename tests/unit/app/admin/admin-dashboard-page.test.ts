import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

import { AdminDashboardPage } from "@/app/(admin)/admin/_components/admin-dashboard-page";

describe("app/admin/admin-dashboard-page", () => {
  it("renders summary cards, range controls, charts, and the Recent Users table", () => {
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
        createElement(AdminDashboardPage, {
          initialError: null,
          initialFilters: { preset: "30d", from: null, to: null },
          initialSnapshot: {
            summary: {
              totalMembers: 8,
              totalSubscribedMembers: 4,
              totalAssets: 12,
              totalSuccessAmountRp: 500000,
            },
            salesSeries: [{ bucketKey: "2026-04-01", bucketLabel: "01 Apr", amountRp: 200000 }],
            memberGrowthSeries: [
              { bucketKey: "2026-04-01", bucketLabel: "01 Apr", newMembers: 1, subscribedMembers: 3 },
            ],
            transactionSeries: [{ bucketKey: "2026-04-01", bucketLabel: "01 Apr", successCount: 2 }],
            subscriptionComposition: { private: 3, share: 1, mixed: 2 },
            recentUsers: [
              {
                userId: "member-1",
                username: "alpha",
                email: "alpha@example.com",
                avatarUrl: null,
                role: "member",
                activePackageName: "Starter",
                lastSeenAt: "2026-04-20T11:00:00.000Z",
              },
            ],
            range: {
              preset: "30d",
              from: "2026-03-22",
              to: "2026-04-20",
              fromIso: "2026-03-22T00:00:00.000Z",
              toIso: "2026-04-20T23:59:59.999Z",
              label: "30 hari",
            },
          },
        }),
      ),
    );

    expect(markup).toContain("Total Member");
    expect(markup).toContain("Sales Trend");
    expect(markup).toContain("Member Growth");
    expect(markup).toContain("Transactions");
    expect(markup).toContain("Recent Users");
    expect(markup).toContain("30 hari");
    expect(markup).toContain("90 hari");
    expect(markup).toContain("alpha@example.com");
  });
});
