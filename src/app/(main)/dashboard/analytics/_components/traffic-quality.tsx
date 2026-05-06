"use client";

import { Ellipsis } from "lucide-react";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartData = [
  { week: 1, actualQuality: 1.2, baselineQuality: 0.6 },
  { week: 2, actualQuality: 2.7, baselineQuality: 1.4 },
  { week: 3, actualQuality: -1.8, baselineQuality: 1.1 },
  { week: 4, actualQuality: 3.6, baselineQuality: 2.9 },
  { week: 5, actualQuality: 4.9, baselineQuality: 4.1 },
  { week: 6, actualQuality: 5.3, baselineQuality: 4.8 },
  { week: 7, actualQuality: 4.6, baselineQuality: 5.0 },
  { week: 8, actualQuality: 5.1, baselineQuality: 5.4 },
];

const chartConfig = {
  actualQuality: { color: "var(--chart-3)", label: "Actual quality" },
  baselineQuality: { color: "var(--muted-foreground)", label: "Baseline quality" },
} satisfies ChartConfig;

export function TrafficQuality() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">Traffic Quality</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" />
        </CardAction>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-68 w-full">
          <ComposedChart data={chartData} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickFormatter={(value) => `Week ${value}`}
              tickLine={false}
              tickMargin={14}
            />
            <YAxis
              axisLine={false}
              domain={[-4, 6]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              tickMargin={10}
              width={34}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent className="w-40" labelFormatter={() => "Traffic quality"} />}
            />
            <Line
              dataKey="baselineQuality"
              dot={false}
              stroke="var(--color-baselineQuality)"
              strokeOpacity={0.65}
              strokeDasharray="4 4"
              strokeWidth={1.75}
              type="linear"
            />
            <Line
              dataKey="actualQuality"
              dot={false}
              activeDot={{ r: 4 }}
              stroke="var(--color-actualQuality)"
              strokeWidth={2.5}
              type="linear"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
