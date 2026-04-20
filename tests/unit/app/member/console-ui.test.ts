import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it, vi } from "vitest";

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
    error: () => undefined,
    success: () => undefined,
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  DialogContent: ({ children, ...props }: React.ComponentProps<"div">) => createElement("div", props, children),
  DialogDescription: ({ children, ...props }: React.ComponentProps<"p">) => createElement("p", props, children),
  DialogFooter: ({ children, ...props }: React.ComponentProps<"div">) => createElement("div", props, children),
  DialogHeader: ({ children, ...props }: React.ComponentProps<"div">) => createElement("div", props, children),
  DialogTitle: ({ children, ...props }: React.ComponentProps<"h2">) => createElement("h2", props, children),
  DialogTrigger: ({ children, ...props }: React.ComponentProps<"button">) => createElement("button", props, children),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  SelectContent: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  SelectGroup: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    createElement("div", { "data-value": value }, children),
  SelectLabel: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
  SelectTrigger: ({ children, ...props }: React.ComponentProps<"button">) => createElement("button", props, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => createElement("span", null, placeholder),
}));

import {
  applySuccessfulRedeemMutation,
  ConsoleRedeemDialog,
} from "@/app/(member)/console/_components/console-redeem-dialog/console-redeem-dialog";
import { ConsoleExtendDialog } from "@/app/(member)/console/_components/console-extend-dialog/console-extend-dialog";
import { ConsolePage } from "@/app/(member)/console/_components/console-page";
import type { MemberPurchasablePackage } from "@/modules/packages/types";

const packages: MemberPurchasablePackage[] = [
  {
    accessKeys: ["tradingview:private"],
    amountRp: 120000,
    durationDays: 30,
    id: "11111111-1111-4111-8111-111111111111",
    isExtended: true,
    name: "Starter",
    packageId: "11111111-1111-4111-8111-111111111111",
    summary: "private",
  },
  {
    accessKeys: ["tradingview:private", "fxreplay:share"],
    amountRp: 250000,
    durationDays: 60,
    id: "22222222-2222-4222-8222-222222222222",
    isExtended: false,
    name: "Switch Pro",
    packageId: "22222222-2222-4222-8222-222222222222",
    summary: "mixed",
  },
];

describe("app/member/console UI", () => {
  it("renders the member console sections, exact paymentError copy, and non-running purchase entry points", () => {
    const markup = renderToStaticMarkup(
      createElement(ConsolePage, {
        initialPackages: [...packages],
        initialPaymentError: "disabled-package",
        initialSnapshot: {
          assets: [],
          subscription: null,
          transactions: [
            {
              amountRp: 120000,
              createdAt: "2026-04-19T10:00:00.000Z",
              id: "33333333-3333-4333-8333-333333333333",
              packageId: "11111111-1111-4111-8111-111111111111",
              packageName: "Starter",
              paidAt: null,
              source: "payment_dummy",
              status: "pending",
            },
          ],
        },
        initialStateSnapshot: {
          latestSubscription: {
            endAt: "2026-04-10T00:00:00.000Z",
            id: "44444444-4444-4444-8444-444444444444",
            packageId: "11111111-1111-4111-8111-111111111111",
            packageName: "Starter",
            startAt: "2026-03-10T00:00:00.000Z",
            status: "expired",
          },
          state: "expired",
        },
      }),
    );

    expect(markup).toContain("Package sudah tidak tersedia untuk pembelian baru.");
    expect(markup).toContain("Status langganan");
    expect(markup).toContain("Asset List");
    expect(markup).toContain("History Subscription");
    expect(markup).toContain("Langganan terakhir sudah berakhir");
    expect(markup).toContain("Pilih package");
    expect(markup).toContain("Redeem CD-Key");
    expect(markup).toContain("pending");
    expect(markup).toContain("Belum ada asset aktif untuk subscription saat ini.");
  });

  it("renders left-icon form fields for the purchase picker and redeem dialog", () => {
    const extendMarkup = renderToStaticMarkup(
      createElement(ConsoleExtendDialog, {
        open: true,
        packages: [...packages],
        state: "none",
        onOpenChange: () => undefined,
      }),
    );
    const redeemMarkup = renderToStaticMarkup(
      createElement(ConsoleRedeemDialog, {
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(extendMarkup).toContain("Pilih package aktif");
    expect(extendMarkup).toContain('data-slot="input-group-addon"');
    expect(redeemMarkup).toContain("Masukkan CD-Key");
    expect(redeemMarkup).toContain('data-slot="input-group-addon"');
  });

  it("refreshes the current route after redeem succeeds", () => {
    const onOpenChange = vi.fn();
    const resetDialogState = vi.fn();
    const refresh = vi.fn();

    applySuccessfulRedeemMutation({
      onOpenChange,
      resetDialogState,
      router: { refresh },
    });

    expect(resetDialogState).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
