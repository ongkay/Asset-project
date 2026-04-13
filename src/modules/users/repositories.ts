import "server-only";

import { readProfileByUserId } from "@/modules/auth/repositories";

export async function findUserProfileById(userId: string) {
  return readProfileByUserId(userId);
}
