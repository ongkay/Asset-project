import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Admin shell</CardTitle>
        <CardDescription>
          Route `/admin` sudah menjadi shell final product app. Dashboard statistik final tetap ditunda sampai Phase 9.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Shell ini menyiapkan landing page admin yang stabil untuk package, asset, subscriber, dan user management pada
        phase berikutnya.
      </CardContent>
    </Card>
  );
}
