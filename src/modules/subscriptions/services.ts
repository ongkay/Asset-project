import "server-only";

import { activateSubscriptionInputSchema } from "./schemas";
import { activateSubscriptionWithEngine } from "./repositories";

export async function activateSubscription(input: unknown) {
  return activateSubscriptionWithEngine(activateSubscriptionInputSchema.parse(input));
}
