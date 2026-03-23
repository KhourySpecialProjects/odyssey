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
  CardFooter,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { filterByDays, filterByDateRange, CHART_TIMEFRAMES } from "@/lib/chart-utils";
import { TimeframeSelector, type DateRange } from "@/components/admin/charts/timeframe-selector";

const chartConfig = {
  duration: {
    label: "Avg Duration (min)",
    color: "#2D7597",
  },
} satisfies ChartConfig;

export function AvgSessionDurationChart({
  data,
}: {
  data: { date: string; duration: number }[];
}) {
  const gradientId = useId();
  const [timeframe, setTimeframe] = useState(7);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  function handlePreset(days: number) {
    setTimeframe(days);
    setDateRange(null);
  }

  const filtered = dateRange
    ? filterByDateRange(data, dateRange.start, dateRange.end)
    : filterByDays(data, timeframe);

  const formatted = filtered.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    duration: d.duration,
  }));

  // Calculate trend: compare last half vs first half
  const mid = Math.floor(formatted.length / 2);
  const firstHalf = formatted.slice(0, mid);
  const secondHalf = formatted.slice(mid);
  const avgFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d.duration, 0) / firstHalf.length
      : 0;
  const avgSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d.duration, 0) / secondHalf.length
      : 0;
  const trendPct =
    avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
  const trendUp = trendPct >= 0;

  return (
    <Card className="flex h-[396px] flex-col overflow-hidden rounded-[20px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] border-0 bg-[#FCFCFD] dark:bg-slate-800">
      <CardHeader className="flex-row items-start justify-between pb-1 pt-5 px-6">
        <CardTitle className="text-[20px] font-medium dark:text-white">
          Avg Session Duration
        </CardTitle>
        <TimeframeSelector
          options={CHART_TIMEFRAMES}
          value={timeframe}
          onChange={handlePreset}
          onDateRange={setDateRange}
          activeDateRange={dateRange}
        />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-6 pb-2">
        {formatted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            No session data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              data={formatted}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                tickFormatter={(v: number) => `${v}m`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: number) => [
                      `${value} min`,
                      "Avg Duration",
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="#2D7597"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      {formatted.length > 0 && (
        <CardFooter className="flex items-center gap-2 px-6 pb-4 pt-0 text-sm">
          {trendUp ? (
            <TrendingUp className="h-4 w-4 text-[#1ea438]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[#ce3131]" />
          )}
          <span
            className={`font-medium ${trendUp ? "text-[#1ea438]" : "text-[#ce3131]"}`}
          >
            {trendUp ? "Trending up" : "Trending down"} by{" "}
            {Math.abs(trendPct).toFixed(1)}% this month
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
