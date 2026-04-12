import Link from "next/link";

import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg border-border/60">
        <CardHeader className="space-y-3">
          <div className="inline-flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldX className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Unauthorized</CardTitle>
            <CardDescription>
              Route ini disiapkan sebagai path final untuk access denial member dan admin.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Phase 0 belum memasang guard final, tetapi halaman ini sudah siap dipakai saat guard server-side ditambahkan.
        </CardContent>
        <CardFooter className="border-t border-border/60 pt-6">
          <Button asChild variant="outline">
            <Link href="/login">Go to login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
