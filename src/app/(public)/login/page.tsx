import { LoginFlow } from "./_components/login-flow";

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialEmail = readSingleSearchParam(resolvedSearchParams.email) ?? "";
  const noticeKey = readSingleSearchParam(resolvedSearchParams.notice);

  const notice = noticeKey === "reset-password-updated" ? "Password updated. Sign in with your new password." : null;

  return <LoginFlow initialEmail={initialEmail} notice={notice} />;
}
