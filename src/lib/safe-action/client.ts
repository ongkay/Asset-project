import "server-only";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { actionLoggingMiddleware } from "./middleware";

const baseActionClient = createSafeActionClient({
  defaultValidationErrorsShape: "flattened",
  defineMetadataSchema() {
    return z.object({
      actionName: z.string().min(1),
    });
  },
  handleServerError(error, { metadata }) {
    console.error("Safe action error:", {
      actionName: metadata?.actionName ?? "unknown_action",
      error,
    });
    return "Unexpected server error.";
  },
});

export const actionClient = baseActionClient.use(actionLoggingMiddleware);
