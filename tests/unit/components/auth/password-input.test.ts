import { Mail } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "@/components/auth/password-input";

describe("components/auth/password-input", () => {
  it("renders a leading icon addon when provided", () => {
    const markup = renderToStaticMarkup(
      createElement(PasswordInput, {
        "aria-label": "Password",
        leadingIcon: createElement(Mail),
      }),
    );

    expect(markup).toContain('type="password"');
    expect(markup).toContain('data-slot="input-group-addon"');
    expect(markup).toContain('aria-label="Show password"');
  });
});
