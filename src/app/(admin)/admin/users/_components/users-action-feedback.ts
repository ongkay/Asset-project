type AdminUsersActionErrorValue = { message?: string } | string | undefined;

type AdminUsersActionResultLike = {
  data?: {
    message?: string;
  };
  serverError?: string;
  validationErrors?: {
    fieldErrors?: Record<string, AdminUsersActionErrorValue[] | undefined>;
    formErrors?: AdminUsersActionErrorValue[];
  };
};

function getFirstErrorMessage(errors: AdminUsersActionErrorValue[] | undefined) {
  const firstError = errors?.[0];

  if (!firstError) {
    return null;
  }

  return typeof firstError === "string" ? firstError : (firstError.message ?? null);
}

export function getAdminUsersActionMessage(result: AdminUsersActionResultLike) {
  return (
    getFirstErrorMessage(result.validationErrors?.formErrors) ?? result.serverError ?? result.data?.message ?? null
  );
}

export function getAdminUsersActionFieldErrorMessage(result: AdminUsersActionResultLike, fieldName: string) {
  return getFirstErrorMessage(result.validationErrors?.fieldErrors?.[fieldName]) ?? getAdminUsersActionMessage(result);
}

export function shouldAllowAdminUsersDialogOpenChange(nextOpen: boolean, isPending: boolean) {
  return nextOpen || !isPending;
}

export function isAdminUsersTableQueryKey(queryKey: readonly unknown[]) {
  return queryKey[0] === "admin-users" && queryKey[1] !== "detail";
}
