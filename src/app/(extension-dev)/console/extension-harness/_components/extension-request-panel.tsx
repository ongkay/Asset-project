import { FileJson, Play, ShieldCheck, UserRound, Wifi } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldTitle } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { ExtensionHarnessScenario } from "./extension-scenario-list";

export function ExtensionRequestPanel(props: {
  activeExtensionId: string;
  allowedIds: string[];
  allowedOrigins: string[];
  connectionState: "waiting" | "ready";
  currentUser: { email: string; role: string; username: string };
  editorValue: string;
  onChangeEditorValue: (value: string) => void;
  onRunScenario: () => Promise<void>;
  onSelectVariant: (variant: "allowed" | "denied") => void;
  scenario: ExtensionHarnessScenario;
  selectedVariant: "allowed" | "denied";
}) {
  const extensionIdentityLabel =
    props.selectedVariant === "denied" && props.activeExtensionId === "denied-id"
      ? "Waiting for denied extension"
      : props.activeExtensionId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw Request Console</CardTitle>
        <CardDescription>
          Editor ini menyiapkan payload mentah, lalu companion extension mengirimkannya dengan cookie `app_session`
          browser yang sama.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-3">
            <UserRound className="size-4 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate text-sm font-medium">{props.currentUser.username}</p>
              <p className="truncate text-xs text-muted-foreground">{props.currentUser.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-3">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium">Role {props.currentUser.role}</p>
              <p className="truncate text-xs text-muted-foreground">Active ID: {extensionIdentityLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-3">
            <Wifi className="size-4 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium">Connection</p>
              <Badge variant={props.connectionState === "ready" ? "secondary" : "outline"}>
                {props.connectionState === "ready" ? "Extension Ready" : "Waiting for Extension"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{props.scenario.label}</Badge>
            <Badge variant={props.scenario.expectedStatus >= 400 ? "destructive" : "secondary"}>
              Expect {props.scenario.expectedStatus}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Origin yang diizinkan: {props.allowedOrigins.join(", ")}</p>
        </div>

        <Separator />

        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldTitle>
                <ShieldCheck className="size-4 text-muted-foreground" />
                Extension Variant
              </FieldTitle>
              <FieldDescription>
                Allowed memakai runtime allowlist. Denied memuat preset origin yang harus ditolak agar JSON tidak perlu
                diubah manual.
              </FieldDescription>
              <ToggleGroup
                aria-label="Select extension variant"
                onValueChange={(value) => {
                  if (value === "allowed" || value === "denied") {
                    props.onSelectVariant(value);
                  }
                }}
                size="sm"
                type="single"
                value={props.selectedVariant}
                variant="outline"
              >
                <ToggleGroupItem aria-label="Use allowed extension variant" value="allowed">
                  Allowed
                </ToggleGroupItem>
                <ToggleGroupItem aria-label="Use denied extension variant" value="denied">
                  Denied
                </ToggleGroupItem>
              </ToggleGroup>
            </FieldContent>
          </Field>

          <Field>
            <FieldContent>
              <FieldTitle>
                <FileJson className="size-4 text-muted-foreground" />
                Raw Request JSON
              </FieldTitle>
              <FieldDescription>
                Edit payload mentah untuk override preset. Request akan dikirim dari extension bridge, bukan dari tab
                web biasa.
              </FieldDescription>
              <Textarea
                className="min-h-80"
                onChange={(event) => props.onChangeEditorValue(event.target.value)}
                value={props.editorValue}
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button disabled={props.connectionState !== "ready"} onClick={() => void props.onRunScenario()}>
          <Play data-icon="inline-start" />
          Run Scenario
        </Button>
      </CardFooter>
    </Card>
  );
}
