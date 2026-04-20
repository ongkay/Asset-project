"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

const transactionChartConfig = {
  successCount: {
    label: "Transaksi Sukses",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type AdminDashboardTransactionsChartProps = {
  series: AdminDashboardSnapshot["transactionSeries"];
};

export function AdminDashboardTransactionsChart({ series }: AdminDashboardTransactionsChartProps) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Jumlah event transaksi sukses per bucket waktu.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-72 w-full" config={transactionChartConfig}>
          <BarChart accessibilityLayer data={series}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="bucketLabel" minTickGap={24} tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="successCount" fill="var(--color-successCount)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
