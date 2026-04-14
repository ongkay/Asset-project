"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Spinner } from "@/components/ui/spinner";
import { completePasswordResetAction, requestPasswordResetAction } from "@/modules/auth/actions";
import { authPasswordSchema, checkAuthEmailInputSchema, type CheckAuthEmailInput } from "@/modules/auth/schemas";

type ResetPasswordFlowProps = {
  initialEmail?: string;
  initialError?: string | null;
  initialView: "invalid" | "request" | "reset";
  resetToken?: string | null;
};

const resetFormSchema = z
  .object({
    confirmPassword: authPasswordSchema,
    password: authPasswordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation must match.",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetFormSchema>;

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

export function ResetPasswordFlow({
  initialEmail = "",
  initialError,
  initialView,
  resetToken = null,
}: ResetPasswordFlowProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<"invalid" | "request" | "request-sent" | "reset">(initialView);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(initialError ?? null);

  const requestResetMutation = useAction(requestPasswordResetAction);
  const completeResetMutation = useAction(completePasswordResetAction);

  const requestForm = useForm<CheckAuthEmailInput>({
    defaultValues: {
      email: initialEmail,
    },
    resolver: zodResolver(checkAuthEmailInputSchema),
  });

  const resetForm = useForm<ResetFormValues>({
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
    resolver: zodResolver(resetFormSchema),
  });

  const headerDescription = useMemo(() => {
    switch (currentView) {
      case "request":
        return "Enter your email address and we will send you a link to reset your password.";
      case "request-sent":
        return "Check your email for the reset link we just sent.";
      case "reset":
        return "Enter your new password below to regain access to your account.";
      case "invalid":
        return "Your reset link has expired or is invalid.";
      default:
        return "Reset your password";
    }
  }, [currentView]);

  async function onSubmitRequest(values: CheckAuthEmailInput) {
    setFeedbackMessage(null);

    const result = await requestResetMutation.executeAsync(values);
    const formError = getActionFormError(result);

    if (formError) {
      requestForm.setError("email", { message: formError, type: "server" });
      return;
    }

    setCurrentView("request-sent");
    setFeedbackMessage(result.data?.message ?? "If the email can receive reset instructions, we sent them.");
  }

  async function onSubmitReset(values: ResetFormValues) {
    if (!resetToken) {
      setCurrentView("invalid");
      setFeedbackMessage("Reset link is invalid or expired. Request a new link to continue.");
      return;
    }

    setFeedbackMessage(null);

    const result = await completeResetMutation.executeAsync({
      confirmPassword: values.confirmPassword,
      email: initialEmail || undefined,
      password: values.password,
      resetToken,
    });

    const formError = getActionFormError(result);

    if (formError) {
      resetForm.setError("password", { message: formError, type: "server" });
      return;
    }

    if (result.data?.ok) {
      router.replace(`${result.data.redirectTo}?notice=reset-password-updated`);
      return;
    }

    if (result.data?.failureReason === "invalid_reset_token") {
      setCurrentView("invalid");
    }

    setFeedbackMessage(result.data?.message ?? "Password could not be updated right now.");
  }

  return (
    <Card className="w-full max-w-xl border-border/60 shadow-sm">
      <CardHeader className="space-y-2 text-center pb-6">
        <CardTitle className="text-3xl font-semibold tracking-tight">Reset your password</CardTitle>
        <CardDescription>{headerDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {feedbackMessage ? (
          <Alert variant={currentView === "invalid" ? "destructive" : "default"}>
            <AlertTitle>{currentView === "invalid" ? "Link unavailable" : "Check your email"}</AlertTitle>
            <AlertDescription>{feedbackMessage}</AlertDescription>
          </Alert>
        ) : null}

        {currentView === "request" ? (
          <form className="space-y-5" noValidate onSubmit={requestForm.handleSubmit(onSubmitRequest)}>
            <FieldGroup className="gap-4">
              <Controller
                control={requestForm.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reset-email">Email address</FieldLabel>
                    <Input
                      {...field}
                      autoComplete="email"
                      id="reset-email"
                      inputMode="email"
                      placeholder="you@example.com"
                      type="email"
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button className="sm:min-w-44" disabled={requestResetMutation.isPending} type="submit">
                {requestResetMutation.isPending ? <Spinner className="size-4" /> : null}
                Send reset instructions
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          </form>
        ) : null}

        {currentView === "request-sent" ? (
          <div className="space-y-5">
            <Alert>
              <AlertTitle>Instructions sent if possible</AlertTitle>
              <AlertDescription>
                If an account exists with that email, we have sent password reset instructions. Please check your inbox.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={() => setCurrentView("request")} type="button" variant="outline">
                Send again
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {currentView === "reset" ? (
          <form className="space-y-5" noValidate onSubmit={resetForm.handleSubmit(onSubmitReset)}>
            {initialEmail ? (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="reset-selected-email">Email</FieldLabel>
                <Input id="reset-selected-email" readOnly type="email" value={initialEmail} />
              </Field>
            ) : null}

            <FieldGroup className="gap-4">
              <Controller
                control={resetForm.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reset-password">New password</FieldLabel>
                    <PasswordInput
                      {...field}
                      autoComplete="new-password"
                      id="reset-password"
                      placeholder="Create your new password"
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                control={resetForm.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reset-confirm-password">Confirm password</FieldLabel>
                    <PasswordInput
                      {...field}
                      autoComplete="new-password"
                      id="reset-confirm-password"
                      placeholder="Repeat your new password"
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={() => setCurrentView("request")} type="button" variant="ghost">
                Request another link
              </Button>
              <Button className="sm:min-w-40" disabled={completeResetMutation.isPending} type="submit">
                {completeResetMutation.isPending ? <Spinner className="size-4" /> : null}
                Save new password
              </Button>
            </div>
          </form>
        ) : null}

        {currentView === "invalid" ? (
          <Empty className="border-border/60 bg-muted/20 p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert className="size-6" />
              </EmptyMedia>
              <EmptyTitle>Reset link is invalid or expired</EmptyTitle>
              <EmptyDescription>
                Your password reset link is invalid or has expired. Please request a new one.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => setCurrentView("request")} type="button">
                  Request a new link
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/login">Back to login</Link>
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : null}
      </CardContent>
    </Card>
  );
}
