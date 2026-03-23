"use client";

import { useId, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { filterByDays, CHART_TIMEFRAMES } from "@/lib/chart-utils";
import { TimeframeSelector } from "@/components/admin/charts/timeframe-selector";

const chartConfig = {
  count: {
    label: "Active Users",
    color: "#2D7597",
  },
} satisfies ChartConfig;

export function ActiveUsersChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const gradientId = useId();
  const [timeframe, setTimeframe] = useState(0);

  const filtered = filterByDays(data, timeframe);

  const formatted = filtered.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: d.count,
  }));

  return (
    <Card className="flex h-[396px] flex-col overflow-hidden rounded-[20px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] border-0 bg-[#FCFCFD] dark:bg-slate-800">
      <CardHeader className="flex-row items-start justify-between pb-1 pt-5 px-6">
        <div>
          <CardTitle className="text-[20px] font-medium dark:text-white">Active Users</CardTitle>
          <CardDescription className="text-[14px] text-[#475569] dark:text-slate-400">
            Showing total visitors over time
          </CardDescription>
        </div>
        <TimeframeSelector options={CHART_TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-6 pb-4">
        {formatted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            No active user data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              data={formatted}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D7597" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2D7597" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#60646c" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#60646c" }}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2D7597"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
