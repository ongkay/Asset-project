import { z } from "zod";

import { cdKeyIssueInputSchema } from "@/modules/cdkeys/schemas";

export type CdKeyFormDialogValues = z.input<typeof cdKeyIssueInputSchema>;

export const DEFAULT_CDKEY_FORM_DIALOG_VALUES: CdKeyFormDialogValues = {
  packageId: "",
  manualCode: null,
  amountRpOverride: null,
};
