"use client";

import { useRouter } from "next/navigation";

import { LogOut } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { logoutAction } from "@/modules/auth/actions";

export function LogoutButton() {
  const router = useRouter();
  const logout = useAction(logoutAction);

  return (
    <Button
      disabled={logout.isPending}
      onClick={async () => {
        const result = await logout.executeAsync();

        if (result.data?.ok) {
          router.replace(result.data.redirectTo);
        }
      }}
      type="button"
      variant="outline"
    >
      {logout.isPending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
      Logout
    </Button>
  );
}
