import { ArrowDownRight, ArrowUpRight, Ellipsis } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsKpiStrip() {
  const cards = [
    { title: "Unique Visitors", value: "213.1k", baseline: "207.3k", delta: "2.8%", positive: true },
    { title: "Sessions", value: "248.6k", baseline: "243.5k", delta: "2.1%", positive: true },
    { title: "Pageviews", value: "547.9k", baseline: "566.8k", delta: "3.3%", positive: false },
    { title: "Engagement Rate", value: "61.4%", baseline: "58.9%", delta: "4.2%", positive: true },
    { title: "Conversion Rate", value: "8.4%", baseline: "8.9%", delta: "5.6%", positive: false },
  ] as const;

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        {cards.map(({ title, value, baseline, delta, positive }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="font-normal text-sm">{title}</CardTitle>
              <CardAction>
                <Ellipsis className="size-4" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-2xl leading-none tracking-tight">{value}</div>
                <Badge
                  className={
                    positive
                      ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                      : "bg-destructive/10 text-destructive"
                  }
                >
                  {positive ? <ArrowUpRight /> : <ArrowDownRight />}
                  {delta}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>
                  from <span className="text-foreground">{baseline}</span>
                </span>
                <span>•</span>
                <span>last 4 weeks</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
