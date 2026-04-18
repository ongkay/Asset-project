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

vi.mock("@/modules/users/actions", () => ({
  createUserAction: vi.fn(),
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

import { UserFormDialog } from "@/app/(admin)/admin/users/_components/user-form-dialog/user-form-dialog";

describe("app/admin/users/user-form-dialog", () => {
  it("renders leading icon addons for the create-user inputs", () => {
    const markup = renderToStaticMarkup(createElement(UserFormDialog, { onOpenChange: () => undefined, open: true }));
    const addonCount = markup.match(/data-slot="input-group-addon"/g)?.length ?? 0;
    const showPasswordCount = markup.match(/aria-label="Show password"/g)?.length ?? 0;

    expect(addonCount).toBeGreaterThanOrEqual(3);
    expect(showPasswordCount).toBe(2);
  });
});
