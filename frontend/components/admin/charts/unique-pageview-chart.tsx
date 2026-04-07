"use client";

import { useState } from "react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
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

function PageviewTooltip({
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
        Pageviews: {payload[0].value}
      </p>
    </div>
  );
}

function RoundedTopCursor({
  x,
  y,
  width,
  height,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  if (x == null || y == null || width == null || height == null) return null;
  const r = Math.min(6, width / 2);
  return (
    <path
      d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h${-width} v${-(height - r)} a${r},${r} 0 0 1 ${r},${-r}z`}
      fill="rgba(0,0,0,0.1)"
    />
  );
}

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

  const mid = Math.floor(formatted.length / 2);
  const firstHalf = formatted.slice(0, mid);
  const secondHalf = formatted.slice(mid);
  const avgFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d.count, 0) / firstHalf.length
      : 0;
  const avgSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d.count, 0) / secondHalf.length
      : 0;
  const trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
  const trendUp = trendPct > 0;

  const periodLabel = dateRange
    ? `from ${formatChartDate(dateRange.start)} – ${formatChartDate(dateRange.end)}`
    : timeframe === 7
      ? "this week"
      : timeframe === 14
        ? "last 2 weeks"
        : timeframe === 30
          ? "this month"
          : `in the last ${timeframe} days`;

  return (
    <div className="flex h-[280px] flex-col overflow-hidden rounded-[20px] border border-[#D0D5DD] bg-[#FCFCFD] dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <p className="text-[20px] font-normal text-black dark:text-white">
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
      <div className="min-h-0 flex-1 px-5 pt-2 pb-0">
        {formatted.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
            No pageview data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
              data={formatted}
              margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
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
              <ChartTooltip
                cursor={<RoundedTopCursor />}
                content={<PageviewTooltip />}
              />
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
      {formatted.length > 0 && (
        <div className="flex items-center gap-2 px-5 pt-0 pb-4 text-sm">
          {trendUp ? (
            <IconTrendingUp className="h-4 w-4 text-[#1ea438]" />
          ) : (
            <IconTrendingDown className="h-4 w-4 text-[#ce3131]" />
          )}
          <span
            className={`font-medium ${trendUp ? "text-[#1ea438]" : "text-[#ce3131]"}`}
          >
            {trendUp ? "Trending up" : "Trending down"} by{" "}
            {Math.abs(trendPct).toFixed(1)}% {periodLabel}
          </span>
        </div>
      )}
    </div>
  );
}
