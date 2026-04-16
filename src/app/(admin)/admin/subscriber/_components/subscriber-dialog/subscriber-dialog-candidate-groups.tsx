"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { SubscriberActivationDraft } from "@/modules/admin/subscriptions/types";

type SubscriberDialogCandidateGroupsProps = {
  draft: SubscriberActivationDraft | null;
  manualAssignmentsByAccessKey: Record<string, string | null>;
  onSelectAssignment: (accessKey: string, assetId: string | null) => void;
  onQuickAddAsset: (accessKey: string, platform: "tradingview" | "fxreplay" | "fxtester") => void;
};

export function SubscriberDialogCandidateGroups({
  draft,
  manualAssignmentsByAccessKey,
  onSelectAssignment,
  onQuickAddAsset,
}: SubscriberDialogCandidateGroupsProps) {
  if (!draft) {
    return null;
  }

  return (
    <div className="grid gap-4">
      {draft.candidateGroups.map((group) => {
        const selectedAssetId =
          manualAssignmentsByAccessKey[group.accessKey] ?? group.currentSelection?.assetId ?? null;

        return (
          <div className="rounded-lg border p-4" key={group.accessKey}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{group.accessKey}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={group.isFulfilled ? "secondary" : "outline"}>
                    {group.isFulfilled ? "Fulfilled" : "Pending"}
                  </Badge>
                  <Badge variant="outline">{group.platform}</Badge>
                  <Badge variant="outline">{group.assetType}</Badge>
                </div>
              </div>
              {group.canQuickAddPrivateAsset ? (
                <Button
                  onClick={() => onQuickAddAsset(group.accessKey, group.platform)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Quick Add Asset
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <Select
                value={selectedAssetId ?? undefined}
                onValueChange={(value) => onSelectAssignment(group.accessKey, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Automatic fallback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Candidates</SelectLabel>
                    <SelectItem value="__auto__">Automatic fallback</SelectItem>
                    {group.candidates.map((candidate) => (
                      <SelectItem key={candidate.assetId} value={candidate.assetId}>
                        {candidate.platform} / {candidate.assetType} / {candidate.note ?? candidate.assetId}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="grid gap-2">
                {group.candidates.map((candidate) => (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-3 text-xs"
                    key={candidate.assetId}
                  >
                    <Badge variant={candidate.isCurrentSelection ? "secondary" : "outline"}>
                      {candidate.isCurrentSelection ? "Current" : candidate.status}
                    </Badge>
                    <span>{candidate.assetId}</span>
                    <span>{candidate.note ?? "No note"}</span>
                    <span>Used {candidate.totalUsed}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
