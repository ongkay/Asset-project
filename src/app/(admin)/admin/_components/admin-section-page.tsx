import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminSectionPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Protected route</Badge>
          <Badge variant="secondary">Admin</Badge>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon />
          </div>
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin">Back to Home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
