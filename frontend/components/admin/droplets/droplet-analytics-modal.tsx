"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import {
  getDropletAnalytics,
  type DropletAnalyticsData,
  type LessonScrollDepth,
} from "@/lib/requests/droplet-analytics";

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
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex h-[200px] w-[361px] flex-col justify-between rounded-[20px] bg-[#fcfcfd] p-6 shadow dark:bg-slate-800">
      <p className="text-[16px] font-medium text-[#475569] dark:text-slate-400">
        {title}
      </p>
      <p className="text-[64px] leading-none font-semibold text-black dark:text-white">
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom bar label (white text inside bar)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Scroll Depth Chart
// ---------------------------------------------------------------------------

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

  return (
    <div className="mt-6 rounded-[20px] bg-[#fcfcfd] p-8 shadow dark:bg-slate-800">
      <h4 className="text-[22px] font-bold text-black dark:text-white">
        Scroll Depth
      </h4>
      <p className="mt-1 text-[16px] text-[#475569] dark:text-slate-400">
        Showing growth/decline in users as they progress through a lesson
      </p>

      {/* Pill tab selector */}
      <div className="mt-5 inline-flex gap-1 rounded-[97px] bg-[#eaecf0] p-1 dark:bg-slate-700">
        {scrollDepth.map((lesson, i) => (
          <button
            key={lesson.lessonId}
            onClick={() => onTabChange(i)}
            className={cn(
              "rounded-[97px] px-4 py-1.5 text-[14px] font-medium transition-colors",
              i === activeIndex
                ? "bg-[#2D7597] text-white shadow"
                : "text-[#475569] hover:text-black dark:text-slate-300 dark:hover:text-white",
            )}
          >
            {lesson.lessonName}
          </button>
        ))}
      </div>

      <div className="mt-6 w-full overflow-x-auto">
        <LineChart
          key={active.lessonId}
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
  const [analytics, setAnalytics] = useState<DropletAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScrollLesson, setActiveScrollLesson] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setActiveScrollLesson(0);
    getDropletAnalytics(droplet.id, droplet.lessons ?? [])
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [open, droplet.id, droplet.lessons]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[1260px] overflow-y-auto !rounded-[20px] border-0 p-0 dark:border-slate-700 dark:bg-slate-900">
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
              <div className="mt-8 flex flex-wrap gap-6">
                <StatCard
                  title="Total Enrolled"
                  value={analytics.totalEnrolled.toLocaleString()}
                />
                <StatCard
                  title="Completed"
                  value={analytics.completedCount.toLocaleString()}
                />
                <StatCard
                  title="Completion Rate"
                  value={`${analytics.completionRate.toFixed(1)}%`}
                />
              </div>

              {/* Lesson-level analytics */}
              {analytics.lessonCompletion.length > 0 && (
                <>
                  <h3 className="mt-12 text-[32px] font-semibold text-black dark:text-white">
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
                          <LabelList dataKey="name" content={BarInsideLabel} />
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
      </DialogContent>
    </Dialog>
  );
}
