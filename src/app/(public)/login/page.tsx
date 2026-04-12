import Link from "next/link";

import { ShieldCheck, KeyRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-xl border-border/60">
      <CardHeader className="space-y-3">
        <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Phase 0 menyiapkan shell final untuk flow auth. Form login penuh akan masuk pada Phase 1.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <KeyRound className="size-4" />
          <AlertTitle>Auth route sudah final</AlertTitle>
          <AlertDescription>
            Path `/login` sekarang menjadi entry point utama untuk member dan admin. Route demo `auth/v1` dan `auth/v2`
            tidak lagi menjadi jalur product utama.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
        <p className="text-sm text-muted-foreground">Belum punya akses atau lupa password?</p>
        <Button asChild variant="outline">
          <Link href="/reset-password">Open reset password shell</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
