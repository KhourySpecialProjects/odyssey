"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  filterByDays,
  filterByDateRange,
  formatChartDate,
  CHART_TIMEFRAMES_COMPACT,
} from "@/lib/chart-utils";
import {
  TimeframeSelector,
  type DateRange,
} from "@/components/admin/charts/timeframe-selector";

const chartConfig = {
  count: {
    label: "Pageviews",
    color: "#2D7597",
  },
} satisfies ChartConfig;

export function UniquePageviewBarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
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
    <div className="flex h-[280px] flex-col overflow-hidden rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <p className="text-[20px] font-medium text-black dark:text-white">
          Daily Unique Pageviews
        </p>
        <TimeframeSelector
          options={CHART_TIMEFRAMES_COMPACT}
          value={timeframe}
          onChange={handlePreset}
          onDateRange={setDateRange}
          activeDateRange={dateRange}
        />
      </div>
      <div className="min-h-0 flex-1 px-5 pb-4">
        {formatted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            No pageview data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
              data={formatted}
              margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#60646c" }}
                interval="preserveStartEnd"
                angle={-35}
                textAnchor="end"
                height={45}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#60646c" }}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#2D7597" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="count"
                  position="top"
                  fill="#60646c"
                  fontSize={11}
                  offset={4}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
