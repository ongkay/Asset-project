export type AdminUsersDialogState =
  | {
      mode: "create";
      open: true;
    }
  | {
      mode: "detail";
      open: true;
      userId: string;
      view: "view" | "edit";
    }
  | {
      mode: "change-password";
      open: true;
      userId: string;
    }
  | {
      currentIsBanned: boolean;
      mode: "toggle-ban";
      open: true;
      userId: string;
      username: string;
    }
  | {
      mode: null;
      open: false;
    };

export function closeAdminUsersDialogState(): AdminUsersDialogState {
  return {
    mode: null,
    open: false,
  };
}

export function openAdminUsersCreateDialogState(): AdminUsersDialogState {
  return {
    mode: "create",
    open: true,
  };
}

export function openAdminUsersDetailDialogState(userId: string, view: "view" | "edit"): AdminUsersDialogState {
  return {
    mode: "detail",
    open: true,
    userId,
    view,
  };
}

export function openAdminUsersPasswordDialogState(userId: string): AdminUsersDialogState {
  return {
    mode: "change-password",
    open: true,
    userId,
  };
}

export function openAdminUsersToggleBanDialogState(input: {
  isBanned: boolean;
  userId: string;
  username: string;
}): AdminUsersDialogState {
  return {
    currentIsBanned: input.isBanned,
    mode: "toggle-ban",
    open: true,
    userId: input.userId,
    username: input.username,
  };
}
