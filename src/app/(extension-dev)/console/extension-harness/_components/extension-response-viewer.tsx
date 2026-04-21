import { History, Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { ExtensionHarnessHistoryEntry } from "./extension-harness-state";

export function ExtensionResponseViewer(props: {
  history: ExtensionHarnessHistoryEntry[];
  latestResponse: null | { body: unknown; status: number };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Viewer</CardTitle>
        <CardDescription>
          Panel ini menampilkan hasil mentah terakhir dan riwayat verifikasi yang disimpan di localStorage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Radar className="size-4 text-muted-foreground" />
              Latest Response Body
            </div>
            <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
              {JSON.stringify(props.latestResponse?.body ?? null, null, 2)}
            </pre>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-medium">HTTP Status</p>
            <Badge variant={props.latestResponse && props.latestResponse.status >= 400 ? "destructive" : "secondary"}>
              {props.latestResponse?.status ?? "-"}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4 text-muted-foreground" />
            Response History
          </div>
          {props.history.length ? (
            props.history.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-2 rounded-lg border border-border/60 px-4 py-3 md:grid-cols-[minmax(0,1fr)_100px_110px] md:items-center"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-sm font-medium">{entry.scenarioId}</p>
                  <p className="text-xs text-muted-foreground">{entry.executedAt}</p>
                </div>
                <Badge variant={entry.summary === "PASS" ? "secondary" : "destructive"}>{entry.summary}</Badge>
                <p className="text-sm text-muted-foreground">status {entry.status}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              History masih kosong. Jalankan scenario pertama untuk mulai menyimpan bukti.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
