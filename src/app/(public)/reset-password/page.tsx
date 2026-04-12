import Link from "next/link";

import { MailCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-xl border-border/60">
      <CardHeader className="space-y-3">
        <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MailCheck className="size-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Shell route final untuk request reset dan set password baru. Implementasi form dan token flow akan masuk di
            Phase 1.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTitle>Reset password path sudah dikunci</AlertTitle>
          <AlertDescription>
            Semua flow lupa password berikutnya akan dibangun di `/reset-password`, bukan lagi di route auth demo.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border/60 pt-6">
        <p className="text-sm text-muted-foreground">Kembali ke auth shell utama.</p>
        <Button asChild variant="outline">
          <Link href="/login">Back to login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
