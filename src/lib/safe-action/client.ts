import "server-only";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

import { actionLoggingMiddleware } from "./middleware";

function getStableServerErrorMessage(error: Error) {
  if (error.message === "Unauthorized") {
    return "Unauthorized.";
  }

  if (error.message === "Forbidden") {
    return "Forbidden.";
  }

  return "Unexpected server error.";
}

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
    return error instanceof Error ? getStableServerErrorMessage(error) : "Unexpected server error.";
  },
});

export const actionClient = baseActionClient.use(actionLoggingMiddleware);
