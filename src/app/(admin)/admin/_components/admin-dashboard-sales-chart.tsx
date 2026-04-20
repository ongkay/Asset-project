"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { AdminTableDateRangeFilter } from "@/components/shared/table-filters/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

import { useAdminDashboardState } from "./use-admin-dashboard-state";
import type { AdminDashboardSnapshot } from "@/modules/admin/dashboard/types";

const salesChartConfig = {
  amountRp: {
    label: "Sales",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type AdminDashboardSalesChartProps = {
  isFetching: boolean;
  snapshot: AdminDashboardSnapshot;
  state: ReturnType<typeof useAdminDashboardState>;
};

export function AdminDashboardSalesChart({ isFetching, snapshot, state }: AdminDashboardSalesChartProps) {
  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <CardTitle>Sales Trend</CardTitle>
        <CardDescription>
          Nilai transaksi sukses untuk range <span className="font-medium text-foreground">{snapshot.range.label}</span>
          .
        </CardDescription>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            type="button"
            variant={state.filters.preset === "30d" ? "default" : "outline"}
            onClick={() => state.setPreset("30d")}
          >
            30 hari
          </Button>
          <Button
            size="sm"
            type="button"
            variant={state.filters.preset === "90d" ? "default" : "outline"}
            onClick={() => state.setPreset("90d")}
          >
            90 hari
          </Button>
          <AdminTableDateRangeFilter
            ariaLabel="Pilih custom date range"
            label="Custom range"
            onChange={state.setCustomDateRange}
            value={state.customRange}
          />
          {isFetching ? <span className="text-muted-foreground text-xs">Updating...</span> : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-2xl tabular-nums text-foreground">
            {formatCurrency(snapshot.summary.totalSuccessAmountRp, {
              currency: "IDR",
              locale: "id-ID",
              noDecimals: true,
            })}
          </p>
          {state.customRangeError ? <p className="text-destructive text-sm">{state.customRangeError}</p> : null}
        </div>

        <ChartContainer className="h-72 w-full" config={salesChartConfig}>
          <AreaChart accessibilityLayer data={snapshot.salesSeries}>
            <defs>
              <linearGradient id="adminDashboardSalesFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amountRp)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-amountRp)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="bucketLabel" minTickGap={24} tickLine={false} tickMargin={8} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `Rp${Number(value).toLocaleString("id-ID")}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    formatCurrency(Number(value), { currency: "IDR", locale: "id-ID", noDecimals: true })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="amountRp"
              fill="url(#adminDashboardSalesFill)"
              stroke="var(--color-amountRp)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
