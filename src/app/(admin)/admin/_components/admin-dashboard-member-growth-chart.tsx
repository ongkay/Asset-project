"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

const memberGrowthChartConfig = {
  newMembers: {
    label: "Member Baru",
    color: "var(--chart-2)",
  },
  subscribedMembers: {
    label: "Member Berlangganan",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type AdminDashboardMemberGrowthChartProps = {
  series: AdminDashboardSnapshot["memberGrowthSeries"];
};

export function AdminDashboardMemberGrowthChart({ series }: AdminDashboardMemberGrowthChartProps) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Member Growth</CardTitle>
        <CardDescription>Pergerakan member baru dan member berlangganan di range aktif.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-72 w-full" config={memberGrowthChartConfig}>
          <LineChart accessibilityLayer data={series}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="bucketLabel" minTickGap={24} tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Line dataKey="newMembers" dot={false} stroke="var(--color-newMembers)" strokeWidth={2} type="monotone" />
            <Line
              dataKey="subscribedMembers"
              dot={false}
              stroke="var(--color-subscribedMembers)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
