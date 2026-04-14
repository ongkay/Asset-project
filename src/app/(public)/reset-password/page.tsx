import { ResetPasswordFlow } from "./_components/reset-password-flow";

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = readSingleSearchParam(resolvedSearchParams.token) ?? null;
  const status = readSingleSearchParam(resolvedSearchParams.insforge_status) ?? null;
  const error = readSingleSearchParam(resolvedSearchParams.insforge_error) ?? null;
  const type = readSingleSearchParam(resolvedSearchParams.insforge_type) ?? null;
  const initialEmail = readSingleSearchParam(resolvedSearchParams.email) ?? "";

  const initialView =
    status === "error" || (type === "reset_password" && !token) ? "invalid" : token ? "reset" : "request";

  return (
    <ResetPasswordFlow initialEmail={initialEmail} initialError={error} initialView={initialView} resetToken={token} />
  );
}
