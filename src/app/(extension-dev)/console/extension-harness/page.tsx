import { notFound, redirect } from "next/navigation";

import { ExtensionHarnessShell } from "./_components/extension-harness-shell";

import { getExtensionRuntimeConfig } from "@/modules/extension/services";
import { getAuthenticatedAppUser } from "@/modules/users/services";

export default async function ExtensionHarnessPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const authenticatedUser = await getAuthenticatedAppUser();

  if (!authenticatedUser) {
    redirect("/login");
  }

  if (authenticatedUser.profile.isBanned) {
    redirect("/unauthorized");
  }

  const runtimeConfig = getExtensionRuntimeConfig();

  return (
    <ExtensionHarnessShell
      allowedIds={runtimeConfig.allowedIds}
      allowedOrigins={runtimeConfig.allowedOrigins}
      currentUser={{
        email: authenticatedUser.profile.email,
        role: authenticatedUser.profile.role,
        username: authenticatedUser.profile.username,
      }}
    />
  );
}
