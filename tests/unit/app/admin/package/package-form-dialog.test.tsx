import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: async () => undefined,
  }),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: () => ({
    executeAsync: async () => ({ data: { ok: true } }),
    isPending: false,
  }),
}));

vi.mock("@/modules/packages/actions", () => ({
  createPackageAction: vi.fn(),
  updatePackageAction: vi.fn(),
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

import { AdminPackageFormDialog } from "@/app/(admin)/admin/package/_components/package-form-dialog/package-form-dialog";

describe("app/admin/package/package-form-dialog", () => {
  it("renders checkout metadata fields and input icons", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminPackageFormDialog, {
        dialogState: { mode: "create", open: true },
        onOpenChange: () => undefined,
        onPackageSaved: () => undefined,
        prefillById: {},
      }),
    );

    expect(markup).toContain("Checkout Group");
    expect(markup).toContain("Original Amount (Rp)");
    expect(markup).toContain("Sort Order");
    expect(markup).toContain("Checkout pricing preview");
    expect(markup.match(/data-slot="input-group-addon"/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});
