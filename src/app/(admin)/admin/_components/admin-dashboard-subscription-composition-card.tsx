"use client";

import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type SubscriptionComposition = {
  private: number;
  share: number;
  mixed: number;
};

const subscriptionCompositionChartConfig = {
  private: {
    label: "Private",
    color: "var(--chart-1)",
  },
  share: {
    label: "Share",
    color: "var(--chart-2)",
  },
  mixed: {
    label: "Mixed",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

type AdminDashboardSubscriptionCompositionCardProps = {
  composition: SubscriptionComposition;
};

export function AdminDashboardSubscriptionCompositionCard({
  composition,
}: AdminDashboardSubscriptionCompositionCardProps) {
  const chartData = [
    { key: "private", label: "Private", value: composition.private, fill: "var(--color-private)" },
    { key: "share", label: "Share", value: composition.share, fill: "var(--color-share)" },
    { key: "mixed", label: "Mixed", value: composition.mixed, fill: "var(--color-mixed)" },
  ];

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Subscription Composition</CardTitle>
        <CardDescription>Komposisi subscription aktif `private`, `share`, dan `mixed` saat ini.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer className="h-60 w-full" config={subscriptionCompositionChartConfig}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent indicator="dot" nameKey="label" />} />
            <Pie data={chartData} dataKey="value" innerRadius={52} outerRadius={86} paddingAngle={4}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {chartData.map((entry) => (
            <div key={entry.key} className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-muted-foreground text-xs">{entry.label}</p>
              <p className="mt-1 font-semibold text-lg tabular-nums">{entry.value.toLocaleString("id-ID")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
