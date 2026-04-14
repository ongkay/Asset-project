"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";

import { PasswordInput } from "@/components/auth/password-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { checkAuthEmailAction, loginAction, registerAction } from "@/modules/auth/actions";
import {
  checkAuthEmailInputSchema,
  signInInputSchema,
  signUpInputSchema,
  type CheckAuthEmailInput,
  type SignInInput,
  type SignUpInput,
} from "@/modules/auth/schemas";

type LoginFlowProps = {
  initialEmail?: string;
  notice?: string | null;
};

type LoginStep = "email" | "password" | "register";

function getActionFormError(result: {
  serverError?: string;
  validationErrors?: {
    formErrors?: string[];
  };
}) {
  return result.validationErrors?.formErrors?.[0] ?? result.serverError ?? null;
}

export function LoginFlow({ initialEmail = "", notice }: LoginFlowProps) {
  const router = useRouter();
  const [selectedEmail, setSelectedEmail] = useState(initialEmail);
  const [activeStep, setActiveStep] = useState<LoginStep>("email");
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showResetPasswordCta, setShowResetPasswordCta] = useState(false);

  const emailBranchAction = useAction(checkAuthEmailAction);
  const loginMutation = useAction(loginAction);
  const registerMutation = useAction(registerAction);

  const emailForm = useForm<CheckAuthEmailInput>({
    defaultValues: {
      email: initialEmail,
    },
    resolver: zodResolver(checkAuthEmailInputSchema),
  });

  const loginForm = useForm<SignInInput>({
    defaultValues: {
      email: initialEmail,
      password: "",
    },
    resolver: zodResolver(signInInputSchema),
  });

  const registerForm = useForm<SignUpInput>({
    defaultValues: {
      confirmPassword: "",
      email: initialEmail,
      password: "",
    },
    resolver: zodResolver(signUpInputSchema),
  });

  function syncSelectedEmail(email: string) {
    setSelectedEmail(email);
    setAuthMessage(null);
    setShowResetPasswordCta(false);
    loginForm.reset({ email, password: "" });
    registerForm.reset({ confirmPassword: "", email, password: "" });
  }

  function goToEmailStep(email?: string) {
    const nextEmail = email ?? selectedEmail ?? emailForm.getValues("email");

    syncSelectedEmail(nextEmail);
    setIsRegisterDialogOpen(false);
    setActiveStep("email");
    emailForm.reset({ email: nextEmail });
  }

  async function onSubmitEmailStep(values: CheckAuthEmailInput) {
    setAuthMessage(null);
    setShowResetPasswordCta(false);

    const result = await emailBranchAction.executeAsync(values);
    const formError = getActionFormError(result);

    if (formError) {
      emailForm.setError("email", { message: formError, type: "server" });
      return;
    }

    if (!result.data) {
      setAuthMessage("We could not continue the login flow right now.");
      return;
    }

    syncSelectedEmail(result.data.normalizedEmail);

    if (result.data.status === "registered") {
      setActiveStep("password");
      return;
    }

    setIsRegisterDialogOpen(true);
  }

  async function onSubmitLoginStep(values: SignInInput) {
    setAuthMessage(null);

    const result = await loginMutation.executeAsync({
      ...values,
      email: selectedEmail,
    });

    const formError = getActionFormError(result);

    if (formError) {
      loginForm.setError("password", { message: formError, type: "server" });
      return;
    }

    if (result.data?.ok) {
      router.replace(result.data.redirectTo);
      return;
    }

    setShowResetPasswordCta(result.data?.showResetPasswordCta ?? false);

    if (result.data?.failureReason === "wrong_password") {
      loginForm.setError("password", {
        message: result.data.message,
        type: "server",
      });

      return;
    }

    setAuthMessage(result.data?.message ?? "Login failed. Try again later.");
  }

  async function onSubmitRegisterStep(values: SignUpInput) {
    setAuthMessage(null);

    const result = await registerMutation.executeAsync({
      ...values,
      email: selectedEmail,
    });

    const formError = getActionFormError(result);

    if (formError) {
      registerForm.setError("password", { message: formError, type: "server" });
      return;
    }

    if (result.data?.ok) {
      router.replace(result.data.redirectTo);
      return;
    }

    setAuthMessage(result.data?.message ?? "Account could not be created right now.");
  }

  return (
    <>
      <Card className="w-full max-w-xl border-border/60 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="outline">Phase 1 Auth</Badge>
              <CardTitle className="text-2xl">Sign in with one flow</CardTitle>
              <CardDescription>
                Start with your email. Existing accounts continue to password, while new emails continue to inline
                register on the same route.
              </CardDescription>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-muted-foreground">
              <ShieldCheck className="size-5" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant={activeStep === "email" ? "default" : "outline"}>1. Email</Badge>
            <Badge variant={activeStep === "password" ? "default" : "outline"}>2. Password</Badge>
            <Badge variant={activeStep === "register" ? "default" : "outline"}>3. Register</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {notice ? (
            <Alert>
              <Mail className="size-4" />
              <AlertTitle>Action completed</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          {authMessage ? (
            <Alert variant="destructive">
              <AlertTitle>We could not continue</AlertTitle>
              <AlertDescription>{authMessage}</AlertDescription>
            </Alert>
          ) : null}

          {activeStep === "email" ? (
            <form className="space-y-5" noValidate onSubmit={emailForm.handleSubmit(onSubmitEmailStep)}>
              <FieldGroup className="gap-4">
                <Controller
                  control={emailForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-email-step">Email address</FieldLabel>
                      <Input
                        {...field}
                        autoComplete="email"
                        id="login-email-step"
                        inputMode="email"
                        placeholder="you@example.com"
                        type="email"
                      />
                      <FieldDescription>We will decide whether to continue to password or register.</FieldDescription>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button className="sm:min-w-36" disabled={emailBranchAction.isPending} type="submit">
                  {emailBranchAction.isPending ? <Spinner className="size-4" /> : <ArrowRight className="size-4" />}
                  Next
                </Button>
              </div>
            </form>
          ) : null}

          {activeStep === "password" ? (
            <form className="space-y-5" noValidate onSubmit={loginForm.handleSubmit(onSubmitLoginStep)}>
              <FieldGroup className="gap-4">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="selected-login-email">Selected email</FieldLabel>
                  <Input autoComplete="email" id="selected-login-email" readOnly type="email" value={selectedEmail} />
                  <FieldDescription>
                    Change email to restart the branch check with a different account.
                  </FieldDescription>
                </Field>

                <Controller
                  control={loginForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-password-step">Password</FieldLabel>
                      <PasswordInput
                        {...field}
                        autoComplete="current-password"
                        id="login-password-step"
                        placeholder="Enter your password"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </FieldGroup>

              {showResetPasswordCta ? (
                <Alert>
                  <AlertTitle>Reset password to continue</AlertTitle>
                  <AlertDescription>
                    You have reached the failed-login threshold for this email.
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/reset-password?email=${encodeURIComponent(selectedEmail)}`}>Reset password</Link>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={() => goToEmailStep(selectedEmail)} type="button" variant="ghost">
                  <ArrowLeft className="size-4" />
                  Change email
                </Button>
                <Button className="sm:min-w-36" disabled={loginMutation.isPending} type="submit">
                  {loginMutation.isPending ? <Spinner className="size-4" /> : null}
                  Sign in
                </Button>
              </div>
            </form>
          ) : null}

          {activeStep === "register" ? (
            <form className="space-y-5" noValidate onSubmit={registerForm.handleSubmit(onSubmitRegisterStep)}>
              <FieldGroup className="gap-4">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="selected-register-email">Selected email</FieldLabel>
                  <Input
                    autoComplete="email"
                    id="selected-register-email"
                    readOnly
                    type="email"
                    value={selectedEmail}
                  />
                </Field>

                <Controller
                  control={registerForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="register-password-step">Password</FieldLabel>
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        id="register-password-step"
                        placeholder="Create a password"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="register-confirm-password-step">Confirm password</FieldLabel>
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        id="register-confirm-password-step"
                        placeholder="Repeat your password"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </FieldGroup>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={() => goToEmailStep(selectedEmail)} type="button" variant="ghost">
                  <ArrowLeft className="size-4" />
                  Change email
                </Button>
                <Button className="sm:min-w-36" disabled={registerMutation.isPending} type="submit">
                  {registerMutation.isPending ? <Spinner className="size-4" /> : null}
                  Create account
                </Button>
              </div>
            </form>
          ) : null}

          <Separator />

          <p className="text-sm text-muted-foreground">
            Successful sign in replaces the previous active device session. Reset password guidance appears only after
            the failed-login threshold is reached.
          </p>
        </CardContent>
      </Card>

      <AlertDialog onOpenChange={setIsRegisterDialogOpen} open={isRegisterDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a new account?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{selectedEmail}</span> is not registered yet. Continue to
              the inline register step on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => goToEmailStep(selectedEmail)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                syncSelectedEmail(selectedEmail);
                setActiveStep("register");
                setIsRegisterDialogOpen(false);
              }}
            >
              Continue register
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
