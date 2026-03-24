"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Dummy data
// ---------------------------------------------------------------------------

const DUMMY_STATS = {
  totalEnrolled: { value: 1243, trend: 12.5, lastMonth: 1105 },
  avgTimeSpent: {
    value: { minutes: 4, seconds: 32 },
    trend: -3.2,
    lastMonth: { minutes: 4, seconds: 41 },
  },
  lessonsCompleted: { value: 876, trend: 8.1, lastMonth: 810 },
};

function getDummyBarData(
  lessons?: { id: number; name: string }[],
): { name: string; count: number }[] {
  if (lessons && lessons.length > 0) {
    return lessons.map((l, i) => ({
      name: l.name,
      count: Math.max(20, Math.round(200 - i * 30 + Math.random() * 40)),
    }));
  }
  return [
    { name: "Intro to React", count: 195 },
    { name: "State Management", count: 162 },
    { name: "Component Design", count: 134 },
    { name: "Hooks Deep Dive", count: 110 },
    { name: "Performance", count: 78 },
  ];
}

const SCROLL_DEPTH_DATA = [
  { stage: "Started", users: 500 },
  { stage: "25%", users: 410 },
  { stage: "50%", users: 305 },
  { stage: "75%", users: 210 },
  { stage: "100%", users: 145 },
];

// ---------------------------------------------------------------------------
// Trend Pill
// ---------------------------------------------------------------------------

function TrendPill({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[14px] font-medium ${
        isPositive
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {isPositive ? "\u2191" : "\u2193"} {Math.abs(value)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  trend,
  lastMonth,
}: {
  title: string;
  value: string;
  trend: number;
  lastMonth: string;
}) {
  return (
    <div className="flex h-[245px] w-[361px] flex-col justify-between rounded-[20px] bg-[#fcfcfd] p-6 shadow dark:bg-slate-800">
      <p className="text-[16px] font-medium text-[#475569] dark:text-slate-400">
        {title}
      </p>
      <div>
        <p className="text-[64px] font-semibold leading-none text-black dark:text-white">
          {value}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <TrendPill value={trend} />
          <span className="text-[14px] text-[#475569] dark:text-slate-400">
            Last month: {lastMonth}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom bar label (white text inside bar)
// ---------------------------------------------------------------------------

function BarInsideLabel(props: Record<string, unknown>) {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DropletAnalyticsModal({
  droplet,
  open,
  onOpenChange,
}: DropletAnalyticsModalProps) {
  const barData = getDummyBarData(droplet.lessons);
  const lessonTabs =
    droplet.lessons && droplet.lessons.length > 0
      ? droplet.lessons.map((l) => l.name)
      : ["Intro to React", "State Management", "Component Design"];
  const [activeLesson, setActiveLesson] = useState(lessonTabs[0]);

  const { totalEnrolled, avgTimeSpent, lessonsCompleted } = DUMMY_STATS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!rounded-[20px] max-w-[1260px] max-h-[90vh] overflow-y-auto p-0 border-0 dark:border-slate-700 dark:bg-slate-900">
        <DialogTitle className="sr-only">
          Droplet Analytics - {droplet.name}
        </DialogTitle>

        {/* ---- Header ---- */}
        <div className="sticky top-0 z-10 rounded-t-[20px] bg-white px-14 pt-10 pb-0 dark:bg-slate-900">
          <div className="flex items-start justify-between">
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
              <p className="text-[14px] text-[#94a3b8] dark:text-slate-500">
                Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <hr className="mt-6 border-[#eaecf0] dark:border-slate-700" />
        </div>

        {/* ---- Body ---- */}
        <div className="px-14 pb-10">
          {/* Stat cards */}
          <div className="mt-8 flex flex-wrap gap-6">
            <StatCard
              title="Total Enrolled"
              value={totalEnrolled.value.toLocaleString()}
              trend={totalEnrolled.trend}
              lastMonth={totalEnrolled.lastMonth.toLocaleString()}
            />
            <StatCard
              title="Avg Time Spent"
              value={`${avgTimeSpent.value.minutes}m ${avgTimeSpent.value.seconds}s`}
              trend={avgTimeSpent.trend}
              lastMonth={`${avgTimeSpent.lastMonth.minutes}m ${avgTimeSpent.lastMonth.seconds}s`}
            />
            <StatCard
              title="Lessons Completed"
              value={lessonsCompleted.value.toLocaleString()}
              trend={lessonsCompleted.trend}
              lastMonth={lessonsCompleted.lastMonth.toLocaleString()}
            />
          </div>

          {/* Lesson-level analytics title */}
          <h3 className="mt-12 text-[32px] font-semibold text-black dark:text-white">
            Lesson-level Analytics
          </h3>

          {/* ---- Marked Complete card ---- */}
          <div className="mt-6 rounded-[20px] bg-[#fcfcfd] p-8 shadow dark:bg-slate-800">
            <h4 className="text-[22px] font-bold text-black dark:text-white">
              Marked Complete
            </h4>
            <p className="mt-1 text-[16px] text-[#475569] dark:text-slate-400">
              Showing the number of users who marked a lesson complete
            </p>

            <div className="mt-6 w-full overflow-x-auto">
              <BarChart
                layout="vertical"
                width={1100}
                height={barData.length * 60 + 40}
                data={barData}
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
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#2D7597"
                  radius={[16, 16, 16, 16]}
                  barSize={36}
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

          {/* ---- Scroll Depth card ---- */}
          <div className="mt-6 rounded-[20px] bg-[#fcfcfd] p-8 shadow dark:bg-slate-800">
            <h4 className="text-[22px] font-bold text-black dark:text-white">
              Scroll Depth
            </h4>
            <p className="mt-1 text-[16px] text-[#475569] dark:text-slate-400">
              Showing growth/decline in users as they progress through a lesson
            </p>

            {/* Pill tab selector */}
            <div className="mt-5 inline-flex gap-1 rounded-[97px] bg-[#eaecf0] p-1 dark:bg-slate-700">
              {lessonTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveLesson(tab)}
                  className={`rounded-[97px] px-4 py-1.5 text-[14px] font-medium transition-colors ${
                    activeLesson === tab
                      ? "bg-[#2D7597] text-white shadow"
                      : "text-[#475569] hover:text-black dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-6 w-full overflow-x-auto">
              <LineChart
                width={1100}
                height={320}
                data={SCROLL_DEPTH_DATA}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="stage"
                  tick={{ fill: "#475569", fontSize: 14 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 14 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
