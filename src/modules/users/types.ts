import type { AuthProfile } from "@/modules/auth/types";
import type { SessionLookupResult } from "@/modules/sessions/types";

export type AuthenticatedAppUser = {
  profile: AuthProfile;
  session: SessionLookupResult;
};
