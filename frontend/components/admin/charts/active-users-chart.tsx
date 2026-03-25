"use client";

import { useId, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  filterByDays,
  filterByDateRange,
  formatChartDate,
  CHART_TIMEFRAMES,
} from "@/lib/chart-utils";
import {
  TimeframeSelector,
  type DateRange,
} from "@/components/admin/charts/timeframe-selector";

const chartConfig = {
  count: {
    label: "Active Users",
    color: "#2D7597",
  },
};

function ActiveUsersTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-medium text-black dark:text-white">
        Active Users: {payload[0].value}
      </p>
    </div>
  );
}

export function ActiveUsersChart({
  data,
}: {
  data: { date: string; count: number }[];
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
    date: formatChartDate(d.date),
    count: d.count,
  }));

  return (
    <Card className="flex h-[396px] flex-col overflow-hidden rounded-[20px] border-0 bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800">
      <CardHeader className="flex-row items-start justify-between px-6 pt-5 pb-1">
        <CardTitle className="text-[20px] font-medium dark:text-white">
          Active Users
        </CardTitle>
        <TimeframeSelector
          options={CHART_TIMEFRAMES}
          value={timeframe}
          onChange={handlePreset}
          onDateRange={setDateRange}
          activeDateRange={dateRange}
        />
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
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
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
                interval={Math.max(0, Math.floor(formatted.length / 7) - 1)}
                padding={{ left: 24, right: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#60646c" }}
                width={40}
              />
              <ChartTooltip content={<ActiveUsersTooltip />} />
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
