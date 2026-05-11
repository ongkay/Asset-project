"use client";

import { useEffect, useState } from "react";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { resendEmailVerificationAction } from "@/modules/auth/actions";

function isGuardFailure(errorMessage: string | null) {
  return errorMessage === "Unauthorized." || errorMessage === "Forbidden.";
}

type ConsoleEmailVerificationAlertProps = {
  initialCooldownRemainingSeconds: number;
  initialEmailVerified: boolean | null;
};

export function ConsoleEmailVerificationAlert({
  initialCooldownRemainingSeconds,
  initialEmailVerified,
}: ConsoleEmailVerificationAlertProps) {
  const router = useRouter();
  const resendMutation = useAction(resendEmailVerificationAction);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(initialCooldownRemainingSeconds);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackVariant, setFeedbackVariant] = useState<"default" | "destructive">("default");

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) {
      return undefined;
    }

    const cooldownTimer = window.setInterval(() => {
      setCooldownRemainingSeconds((currentValue) => (currentValue <= 1 ? 0 : currentValue - 1));
    }, 1000);

    return () => window.clearInterval(cooldownTimer);
  }, [cooldownRemainingSeconds]);

  if (initialEmailVerified !== false) {
    return null;
  }

  async function handleResendVerificationEmail() {
    if (cooldownRemainingSeconds > 0) {
      return;
    }

    setFeedbackMessage(null);

    const result = await resendMutation.executeAsync();
    const serverError = result.serverError ?? null;

    if (isGuardFailure(serverError)) {
      router.refresh();
      return;
    }

    if (serverError) {
      setFeedbackVariant("destructive");
      setFeedbackMessage(serverError);
      return;
    }

    if (result.data?.ok) {
      setFeedbackVariant("default");
      setFeedbackMessage(result.data.message);
      setCooldownRemainingSeconds(result.data.retryAfterSeconds ?? 0);
      return;
    }

    if (typeof result.data?.retryAfterSeconds === "number") {
      setCooldownRemainingSeconds(result.data.retryAfterSeconds);
    }

    setFeedbackVariant("destructive");
    setFeedbackMessage(result.data?.message ?? "Verification link could not be sent right now.");
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Mail className="size-4" />
        <AlertTitle>Email belum terverifikasi</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            Konfirmasi email Anda untuk memastikan inbox akun ini tetap bisa dipakai untuk recovery dan notifikasi
            penting. Link verifikasi dapat dibuka dari browser atau perangkat mana pun.
          </p>

          <div>
            <Button
              disabled={resendMutation.isPending || cooldownRemainingSeconds > 0}
              onClick={() => void handleResendVerificationEmail()}
              size="sm"
              type="button"
              variant="outline"
            >
              {resendMutation.isPending ? <Spinner className="size-4" /> : <Mail className="size-4" />}
              {cooldownRemainingSeconds > 0
                ? `Kirim ulang dalam ${cooldownRemainingSeconds} detik`
                : "Kirim link verifikasi"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {feedbackMessage ? (
        <Alert variant={feedbackVariant}>
          <Mail className="size-4" />
          <AlertTitle>
            {feedbackVariant === "destructive" ? "Pengiriman belum berhasil" : "Periksa email Anda"}
          </AlertTitle>
          <AlertDescription>{feedbackMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
