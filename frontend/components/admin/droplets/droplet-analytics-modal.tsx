"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Tooltip,
  type LabelProps,
} from "recharts";
import { IconTrendingUp, IconTrendingDown, IconX } from "@tabler/icons-react";
import {
  getDropletAnalytics,
  type DropletAnalyticsData,
  type LessonScrollDepth,
} from "@/lib/requests/droplet-analytics";

interface DropletAnalyticsModalProps {
  droplet: {
    id: number;
    name: string;
    slug: string;
    lessons?: { id: number; name: string }[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatCard({
  title,
  value,
  lastMonth,
  trend,
}: {
  title: string;
  value: string;
  lastMonth: string;
  trend?: { value: string; direction: "up" | "down" } | null;
}) {
  return (
    <div className="flex h-[135px] flex-1 flex-col justify-between rounded-[20px] bg-[#fcfcfd] px-[20px] py-[14px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800">
      <p className="text-[16px] leading-none font-normal text-black dark:text-white">
        {title}
      </p>
      <div className="flex items-center gap-[6px]">
        <span className="text-[40px] leading-none font-semibold text-black dark:text-white">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-[5px] rounded-[36px] px-[8px] py-[4px] text-[12px] font-normal",
              trend.direction === "up"
                ? "bg-[#f0f9f5] text-[#1ea438] dark:bg-[#1ea438]/10"
                : "bg-[#fcefe9] text-[#ce3131] dark:bg-[#ce3131]/10",
            )}
          >
            {trend.direction === "up" ? (
              <IconTrendingUp className="h-[9px] w-[7px]" />
            ) : (
              <IconTrendingDown className="h-[9px] w-[7px]" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-[16px] font-normal text-black dark:text-slate-300">
        Last month: {lastMonth}
      </p>
    </div>
  );
}

function computeTrend(
  current: number,
  last: number,
): { value: string; direction: "up" | "down" } | null {
  if (last === 0) return null;
  const pct = ((current - last) / last) * 100;
  return {
    value: `${Math.abs(pct).toFixed(1)}%`,
    direction: pct >= 0 ? "up" : "down",
  };
}

function RoundedRightCursor({
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
  const r = 6;
  return (
    <path
      d={`M${x},${y} h${width - r} a${r},${r} 0 0 1 ${r},${r} v${height - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(width - r)}z`}
      fill="rgba(0,0,0,0.1)"
    />
  );
}

function BarInsideLabel(props: LabelProps) {
  const { x, y, width, height, value } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
  };
  if (width < 60) return null;
  return (
    <text
      x={Number(x) + 12}
      y={Number(y) + Number(height) / 2}
      dominantBaseline="central"
      fill="#fff"
      fontSize={14}
      fontWeight={600}
    >
      {value}
    </text>
  );
}

function ScrollDepthChart({
  scrollDepth,
  activeIndex,
  onTabChange,
}: {
  scrollDepth: LessonScrollDepth[];
  activeIndex: number;
  onTabChange: (i: number) => void;
}) {
  const active = scrollDepth[activeIndex];
  const chartData = active.points.map((p) => ({
    stage: p.label,
    users: p.count,
  }));

  // Sliding pill for tab selector
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = tabRefs.current.get(activeIndex);
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIndex]);

  const prevIndexRef = useRef(activeIndex);
  const [animClass, setAnimClass] = useState("");
  useEffect(() => {
    if (prevIndexRef.current === activeIndex) return;
    const dir =
      activeIndex > prevIndexRef.current ? "slide-left" : "slide-right";
    prevIndexRef.current = activeIndex;
    setAnimClass(dir);
    const t = setTimeout(() => setAnimClass(""), 300);
    return () => clearTimeout(t);
  }, [activeIndex]);

  return (
    <div className="mt-6 rounded-[20px] bg-[#fcfcfd] p-8 shadow dark:bg-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-[22px] font-bold text-black dark:text-white">
            Scroll Depth
          </h4>
          <p className="mt-1 text-[16px] text-[#475569] dark:text-slate-400">
            Showing growth/decline in users as they progress through a lesson
          </p>
        </div>
        {scrollDepth[activeIndex].estimated && (
          <span className="mt-1 shrink-0 rounded-full bg-[#2D7597] px-3 py-1 text-[13px] text-white">
            Estimated — real tracking in progress
          </span>
        )}
      </div>

      {/* Sliding pill tab selector */}
      <div className="mt-5 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="relative inline-flex rounded-[97px] bg-[#eaecf0] p-1 dark:bg-slate-700">
          <div
            className="absolute rounded-[97px] bg-[#2D7597] shadow transition-all duration-200 ease-in-out"
            style={{ left: pill.left, width: pill.width, top: 4, bottom: 4 }}
          />
          {scrollDepth.map((lesson, i) => (
            <button
              key={lesson.lessonId}
              ref={(el) => {
                if (el) tabRefs.current.set(i, el);
                else tabRefs.current.delete(i);
              }}
              onClick={() => onTabChange(i)}
              className={cn(
                "relative z-10 shrink-0 rounded-[97px] px-4 py-1.5 text-[14px] font-medium whitespace-nowrap transition-colors duration-200",
                i === activeIndex
                  ? "text-white"
                  : "text-[#475569] hover:text-black dark:text-slate-300 dark:hover:text-white",
              )}
            >
              {lesson.lessonName}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("mt-6 w-full overflow-x-auto", animClass)}>
        <LineChart
          width={1100}
          height={320}
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="stage"
            tick={{ fill: "#475569", fontSize: 14 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            padding={{ left: 24, right: 10 }}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 14 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,.1)",
            }}
          />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#2D7597"
            strokeWidth={3}
            dot={{ r: 5, fill: "#2D7597", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </div>
    </div>
  );
}

export function DropletAnalyticsModal({
  droplet,
  open,
  onOpenChange,
}: DropletAnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<DropletAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScrollLesson, setActiveScrollLesson] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setActiveScrollLesson(0);
    getDropletAnalytics(droplet.id, droplet.lessons ?? [])
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [open, droplet.id, droplet.lessons]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[1260px] overflow-hidden !rounded-[20px] border-0 p-0 dark:border-slate-700 dark:bg-slate-900">
        <DialogTitle className="sr-only">
          Droplet Analytics - {droplet.name}
        </DialogTitle>

        <div className="flex max-h-[90vh] flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {/* ---- Header ---- */}
          <div className="sticky top-0 z-10 rounded-t-[20px] bg-white pt-10 pr-10 pb-0 pl-14 dark:bg-slate-900">
            <DialogClose className="absolute top-7 right-7 rounded-full p-1.5 text-[#475569] transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <IconX className="h-5 w-5" />
            </DialogClose>
            <div className="flex items-baseline justify-between pr-8">
              <div>
                <h2 className="text-[40px] font-semibold text-black dark:text-white">
                  Analytics
                </h2>
                <p className="text-[20px] text-[#475569] dark:text-slate-400">
                  View droplet-level analytics
                </p>
              </div>
              <div className="text-right">
                <p className="text-[32px] font-semibold text-black dark:text-white">
                  {droplet.name}
                </p>
                <p className="text-[14px] text-[#475569] dark:text-slate-400">
                  Last updated:{" "}
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <hr className="mt-6 border-[#eaecf0] dark:border-slate-700" />
          </div>

          {/* ---- Body ---- */}
          <div className="px-14 pb-10">
            {loading || !analytics ? (
              <div className="mt-12 flex items-center justify-center py-20">
                <p className="text-[18px] text-[#475569] dark:text-slate-400">
                  {loading ? "Loading analytics…" : "No data available."}
                </p>
              </div>
            ) : (
              <>
                {/* Stat cards */}
                <div className="mt-8 flex gap-4">
                  <StatCard
                    title="Total Enrolled"
                    value={analytics.totalEnrolled.toLocaleString()}
                    lastMonth={analytics.lastMonthEnrolled.toLocaleString()}
                    trend={computeTrend(
                      analytics.totalEnrolled,
                      analytics.lastMonthEnrolled,
                    )}
                  />
                  <StatCard
                    title="Completed"
                    value={analytics.completedCount.toLocaleString()}
                    lastMonth={analytics.lastMonthCompleted.toLocaleString()}
                    trend={computeTrend(
                      analytics.completedCount,
                      analytics.lastMonthCompleted,
                    )}
                  />
                  <StatCard
                    title="Completion Rate"
                    value={`${analytics.completionRate.toFixed(1)}%`}
                    lastMonth={`${analytics.lastMonthCompletionRate.toFixed(1)}%`}
                    trend={computeTrend(
                      analytics.completionRate,
                      analytics.lastMonthCompletionRate,
                    )}
                  />
                  <StatCard
                    title="Average Rating"
                    value={
                      analytics.averageRating === null
                        ? "N/A"
                        : `${analytics.averageRating} / 5`
                    }
                    lastMonth={
                      analytics.lastMonthAverageRating === null
                        ? "N/A"
                        : `${analytics.lastMonthAverageRating} / 5`
                    }
                    trend={
                      analytics.averageRating !== null &&
                      analytics.lastMonthAverageRating !== null
                        ? computeTrend(
                            analytics.averageRating,
                            analytics.lastMonthAverageRating,
                          )
                        : null
                    }
                  />
                </div>

                {/* Lesson-level analytics */}
                {analytics.lessonCompletion.length > 0 && (
                  <>
                    <h3 className="mt-8 text-[32px] font-semibold text-black dark:text-white">
                      Lesson-level Analytics
                    </h3>

                    <div className="mt-6 rounded-[20px] bg-[#fcfcfd] p-8 shadow dark:bg-slate-800">
                      <h4 className="text-[22px] font-bold text-[#1c2024] dark:text-white">
                        Marked Complete
                      </h4>
                      <p className="mt-1 text-[20px] text-[#60646c] dark:text-slate-400">
                        Showing the number of users who marked a lesson complete
                      </p>

                      <div className="mt-6 w-full overflow-x-auto">
                        <BarChart
                          layout="vertical"
                          width={1100}
                          height={analytics.lessonCompletion.length * 60 + 40}
                          data={analytics.lessonCompletion}
                          margin={{ top: 10, right: 60, left: 0, bottom: 10 }}
                          barCategoryGap="20%"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" hide />
                          <Tooltip
                            cursor={<RoundedRightCursor />}
                            contentStyle={{
                              borderRadius: 12,
                              border: "none",
                              boxShadow: "0 4px 12px rgba(0,0,0,.1)",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#2D7597"
                            radius={[0, 6, 6, 0]}
                            barSize={44}
                          >
                            <LabelList
                              dataKey="name"
                              content={BarInsideLabel}
                            />
                            <LabelList
                              dataKey="count"
                              position="right"
                              fill="#334155"
                              fontSize={14}
                              fontWeight={600}
                            />
                          </Bar>
                        </BarChart>
                      </div>
                    </div>

                    {/* ---- Scroll Depth chart ---- */}
                    {analytics.scrollDepth.length > 0 && (
                      <ScrollDepthChart
                        scrollDepth={analytics.scrollDepth}
                        activeIndex={activeScrollLesson}
                        onTabChange={setActiveScrollLesson}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
