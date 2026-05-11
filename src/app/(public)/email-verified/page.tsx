import Link from "next/link";

import { CircleAlert, CircleCheckBig, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReactNode } from "react";

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type EmailVerifiedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type VerificationPageState = "error" | "invalid" | "success";

function resolveVerificationPageState(input: { status: string | null; type: string | null }): VerificationPageState {
  if (input.type !== "verify_email") {
    return "invalid";
  }

  if (input.status === "success") {
    return "success";
  }

  if (input.status === "error") {
    return "error";
  }

  return "invalid";
}

export default async function EmailVerifiedPage({ searchParams }: EmailVerifiedPageProps) {
  const resolvedSearchParams = await searchParams;
  const verificationStatus = readSingleSearchParam(resolvedSearchParams.insforge_status) ?? null;
  const verificationType = readSingleSearchParam(resolvedSearchParams.insforge_type) ?? null;
  const verificationError = readSingleSearchParam(resolvedSearchParams.insforge_error) ?? null;
  const pageState = resolveVerificationPageState({
    status: verificationStatus,
    type: verificationType,
  });

  const pageContent = {
    error: {
      description:
        verificationError ??
        "Link verifikasi tidak valid atau sudah kedaluwarsa. Minta link baru dari aplikasi untuk melanjutkan.",
      icon: <CircleAlert className="size-6" />,
      title: "Link verifikasi tidak tersedia",
    },
    invalid: {
      description:
        "Buka halaman ini dari link verifikasi email yang dikirim oleh sistem agar status akun Anda bisa diproses.",
      icon: <LogIn className="size-6" />,
      title: "Halaman verifikasi email",
    },
    success: {
      description:
        "Email berhasil diverifikasi. Jika Anda membuka link ini dari browser lain, masuk kembali untuk melanjutkan ke aplikasi.",
      icon: <CircleCheckBig className="size-6" />,
      title: "Email berhasil diverifikasi",
    },
  } satisfies Record<VerificationPageState, { description: string; icon: ReactNode; title: string }>;

  const currentPageContent = pageContent[pageState];

  return (
    <Card className="w-full max-w-xl border-border/60 shadow-sm">
      <CardHeader className="space-y-4 pb-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-foreground">
          {currentPageContent.icon}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-semibold tracking-tight">{currentPageContent.title}</CardTitle>
          <CardDescription>{currentPageContent.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        {pageState === "success"
          ? "Setelah kembali ke console, warning verifikasi email akan hilang otomatis pada request berikutnya."
          : "Jika Anda masih membutuhkan akses, kembali ke aplikasi lalu minta link verifikasi baru dari halaman console."}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="sm:min-w-40">
          <Link href="/login">Masuk</Link>
        </Button>
        <Button asChild type="button" variant="ghost">
          <Link href="/console">Buka console</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
