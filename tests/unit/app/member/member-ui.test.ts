import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, priority: _priority, src, ...props }: React.ComponentProps<"img"> & { priority?: boolean }) =>
    React.createElement("img", { alt, src, ...props }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: () => ({
    executeAsync: async () => ({ data: { ok: false, message: "noop" } }),
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DialogContent: ({
    children,
    showCloseButton: _showCloseButton,
    ...props
  }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) => React.createElement("div", props, children),
  DialogDescription: ({ children, ...props }: React.ComponentProps<"p">) => React.createElement("p", props, children),
  DialogFooter: ({ children, ...props }: React.ComponentProps<"div">) => React.createElement("div", props, children),
  DialogHeader: ({ children, ...props }: React.ComponentProps<"div">) => React.createElement("div", props, children),
  DialogTitle: ({ children, ...props }: React.ComponentProps<"h2">) => React.createElement("h2", props, children),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DropdownMenuContent: ({ children, ...props }: React.ComponentProps<"div">) =>
    React.createElement("div", props, children),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DropdownMenuItem: ({ children, asChild: _asChild, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) =>
    React.createElement("div", props, children),
  DropdownMenuLabel: ({ children, ...props }: React.ComponentProps<"div">) =>
    React.createElement("div", props, children),
  DropdownMenuSeparator: (props: React.ComponentProps<"hr">) => React.createElement("hr", props),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  TabsContent: ({ children, ...props }: React.ComponentProps<"div">) => React.createElement("div", props, children),
  TabsList: ({ children, ...props }: React.ComponentProps<"div">) => React.createElement("div", props, children),
  TabsTrigger: ({ children, ...props }: React.ComponentProps<"button">) =>
    React.createElement("button", props, children),
}));

import { MemberPage } from "@/app/(member)/member/_components/member-page";
import { MemberInstallationTabs } from "@/app/(member)/member/_components/member-installation-tabs";
import {
  MemberRedeemDialog,
  applySuccessfulMemberRedeemMutation,
} from "@/app/(member)/member/_components/member-redeem-dialog";
import { MemberSubscriptionCard } from "@/app/(member)/member/_components/member-subscription-card";
import { applySuccessfulLogoutRedirect } from "@/app/(member)/member/_components/member-user-menu";

describe("app/member/member UI", () => {
  it("renders the canonical member layout, paymentError feedback, support links, tutorial content, and menu actions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MemberPage, {
        initialPaymentError: "disabled-package",
        initialSnapshot: {
          assets: [],
          subscription: null,
          transactions: [],
        },
        initialStateSnapshot: {
          latestSubscription: {
            endAt: "2026-05-12T00:00:00.000Z",
            id: "44444444-4444-4444-8444-444444444444",
            packageId: "11111111-1111-4111-8111-111111111111",
            packageName: "Semi private 360 days",
            startAt: "2026-05-12T00:00:00.000Z",
            status: "expired",
          },
          state: "expired",
        },
        profile: {
          avatarUrl: null,
          email: "ahmad@example.com",
          isBanned: false,
          publicId: "MEM-1",
          role: "member",
          userId: "11111111-1111-4111-8111-111111111111",
          username: "Ahmad Dani",
        },
      }),
    );

    expect(markup).toContain("Welcome back, Ahmad! 👋");
    expect(markup).toContain("Kelola langganan dan akses ekstensi TvLink Anda melalui dashboard ini.");
    expect(markup).toContain("Checkout belum bisa dilanjutkan");
    expect(markup).toContain("Package sudah tidak tersedia untuk pembelian baru.");
    expect(markup).toContain("Subscription");
    expect(markup).toContain("Semi private 360 days");
    expect(markup).toContain("expired");
    expect(markup).toContain('href="/checkout"');
    expect(markup).toContain("Hubungi Admin");
    expect(markup).toContain('href="https://wa.link/w3xnqc"');
    expect(markup).toContain("Grup Komunitas");
    expect(markup).toContain('href="https://t.me/pk_oa"');
    expect(markup).toContain("Cara Install Extension TvLink");
    expect(markup).toContain("PC / Laptop");
    expect(markup).toContain("Android (Kiwi)");
    expect(markup).toContain("chrome://extensions/");
    expect(markup).toContain('data-video-id="rjQpnHK5zTw"');
    expect(markup).toContain("/member/thumbnail-pc.jpg");
    expect(markup).toContain("Account");
    expect(markup).toContain("Extend Subscriber");
    expect(markup).toContain("Logout");
  });

  it("renders the Android tutorial panel with the required video id and thumbnail when that tab is active", () => {
    const markup = renderToStaticMarkup(React.createElement(MemberInstallationTabs, { initialTab: "android" }));

    expect(markup).toContain("Download Install Kiwi Browser dari Play Store:");
    expect(markup).toContain('data-video-id="hm2RDtn427U"');
    expect(markup).toContain("/member/thumbnail-hp.jpg");
  });

  it("renders fallback subscription placeholders for members without any subscription", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MemberSubscriptionCard, {
        onOpenRedeem: () => undefined,
        snapshot: {
          assets: [],
          subscription: null,
          transactions: [],
        },
        stateSnapshot: {
          latestSubscription: null,
          state: "none",
        },
      }),
    );

    expect(markup).toContain("none");
    expect(markup).toContain("Active Plan");
    expect(markup).toContain("Start Date");
    expect(markup).toContain("Expiry Date");
    expect(markup.match(/>-</g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("renders the redeem form with the exact modal copy and a left input icon", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MemberRedeemDialog, {
        onOpenChange: () => undefined,
        open: true,
      }),
    );

    expect(markup).toContain("Redeem Voucher");
    expect(markup).toContain("Masukkan kode voucher atau CD key Anda untuk mengaktifkan langganan TvLink.");
    expect(markup).toContain("Kode Voucher");
    expect(markup).toContain("Contoh: TVL-XXXX-XXXX");
    expect(markup).toContain('data-slot="input-group-addon"');
  });

  it("closes the modal, refreshes the route, and shows a success toast after redeem succeeds", () => {
    vi.useFakeTimers();

    const onOpenChange = vi.fn();
    const queueRouteRefresh = vi.fn((refresh: () => void) => refresh());
    const resetDialogState = vi.fn();
    const refresh = vi.fn();
    const showSuccessToast = vi.fn();

    applySuccessfulMemberRedeemMutation({
      onOpenChange,
      queueRouteRefresh,
      resetDialogState,
      router: { refresh },
      showSuccessToast,
    });

    expect(resetDialogState).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(queueRouteRefresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(showSuccessToast).toHaveBeenCalledWith("Voucher berhasil di-redeem!");

    vi.useRealTimers();
  });

  it("redirects the router to the logout target after a successful logout", () => {
    const replace = vi.fn();

    applySuccessfulLogoutRedirect({
      redirectTo: "/login",
      router: { replace },
    });

    expect(replace).toHaveBeenCalledWith("/login");
  });
});
