import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import EmailVerifiedPage from "@/app/(public)/email-verified/page";

describe("app/public/email-verified/page", () => {
  it("renders a success confirmation and public follow-up CTAs", async () => {
    const element = await EmailVerifiedPage({
      searchParams: Promise.resolve({
        insforge_status: "success",
        insforge_type: "verify_email",
      }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Email berhasil diverifikasi");
    expect(markup).toContain("Masuk");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/console"');
  });

  it("renders the provider error when the verification redirect returns an error state", async () => {
    const element = await EmailVerifiedPage({
      searchParams: Promise.resolve({
        insforge_error: "Verification link expired.",
        insforge_status: "error",
        insforge_type: "verify_email",
      }),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Link verifikasi tidak tersedia");
    expect(markup).toContain("Verification link expired.");
    expect(markup).toContain("Buka console");
  });
});
