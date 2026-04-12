import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConsolePage() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Member console shell</CardTitle>
        <CardDescription>
          Route `/console` sudah berada di topology final product app dan siap dipasangi guard, query layer, dan UI
          subscription pada phase berikutnya.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Placeholder ini sengaja tipis agar Phase 1 dan Phase 6 dapat membangun flow final di atas route yang sudah
        stabil.
      </CardContent>
    </Card>
  );
}
