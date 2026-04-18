type UserDetailFormProfile = {
  avatarUrl: string | null;
  userId: string;
  username: string;
};

export const DEFAULT_USER_DETAIL_FORM_VALUES = {
  avatarUrl: null,
  userId: "00000000-0000-0000-0000-000000000000",
  username: "user",
};

type ResolveUserDetailFormResetValuesInput = {
  isDirty: boolean;
  isEditMode: boolean;
  isOpen: boolean;
  profile: UserDetailFormProfile | null;
  userId: string | null;
};

export function resolveUserDetailFormResetValues({
  isDirty,
  isEditMode,
  isOpen,
  profile,
  userId,
}: ResolveUserDetailFormResetValuesInput) {
  if (!isOpen) {
    return DEFAULT_USER_DETAIL_FORM_VALUES;
  }

  if (!profile || profile.userId !== userId) {
    return {
      ...DEFAULT_USER_DETAIL_FORM_VALUES,
      userId: userId ?? DEFAULT_USER_DETAIL_FORM_VALUES.userId,
    };
  }

  if (isEditMode && isDirty) {
    return null;
  }

  return {
    avatarUrl: profile.avatarUrl,
    userId: profile.userId,
    username: profile.username,
  };
}

export function canEditUserDetailForm({
  hasDetail,
  isDetailDialogBusy,
  isEditMode,
}: {
  hasDetail: boolean;
  isDetailDialogBusy: boolean;
  isEditMode: boolean;
}) {
  return isEditMode && hasDetail && !isDetailDialogBusy;
}
