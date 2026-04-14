import Link from "next/link";

import { ArrowRight, HardDrive, History, KeyRound, Package, UserCog, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const overviewCards = [
  {
    href: "/admin/package",
    icon: Package,
    title: "Package",
    description: "Manage pricing, duration, checkout URLs, and entitlement sets.",
  },
  {
    href: "/admin/assets",
    icon: HardDrive,
    title: "Assets",
    description: "Track inventory, availability, notes, and operational state.",
  },
  {
    href: "/admin/subscriber",
    icon: UserCog,
    title: "Subscriber",
    description: "Adjust subscription state and assignment overrides.",
  },
  {
    href: "/admin/cdkey",
    icon: KeyRound,
    title: "CD-Key",
    description: "Issue reusable keys and monitor usage history.",
  },
  {
    href: "/admin/users",
    icon: Users,
    title: "Users",
    description: "Create users, ban/unban, and update account access.",
  },
  {
    href: "/admin/userlogs",
    icon: History,
    title: "User Logs",
    description: "Review login history, extension activity, and transactions.",
  },
] as const;

export function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge>Admin Home</Badge>
            <Badge variant="outline">Workspace</Badge>
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight">Admin shell</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Use this workspace to move between management areas, review activity, and prepare operational changes.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((item) => (
          <Card key={item.href} className="border-border/60 shadow-xs">
            <CardHeader className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon />
              </div>
              <div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription className="mt-1">{item.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href={item.href}>
                  Open {item.title}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
