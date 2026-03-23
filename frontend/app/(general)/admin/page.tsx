import { Suspense } from "react";
import {
  fetchAvgSessionDuration,
  fetchUniquePageview,
  fetchWeeklyActiveUsers,
} from "@/lib/requests/posthog";
import { getAdminDashboardStats } from "@/lib/requests/admin-stats";
import { Card } from "@/components/ui/card";
import { ActiveUsersChart } from "@/components/admin/charts/active-users-chart";
import { AvgSessionDurationChart } from "@/components/admin/charts/avg-session-duration-chart";
import { UniquePageviewBarChart } from "@/components/admin/charts/unique-pageview-chart";
import { TrendingDown, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

// ——— Skeletons ———

function StatCardSkeleton() {
  return (
    <div className="h-[130px] animate-pulse rounded-[20px] bg-[#FCFCFD] dark:bg-slate-800 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="px-[27px] pt-[14px]">
        <div className="h-[18px] w-[120px] rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-[10px] h-[40px] w-[80px] rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-[8px] h-[16px] w-[140px] rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = "h-[280px]" }: { height?: string }) {
  return (
    <div
      className={`${height} animate-pulse rounded-[20px] bg-[#FCFCFD] dark:bg-slate-800 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]`}
    >
      <div className="px-5 pt-4">
        <div className="h-[20px] w-[180px] rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-[14px] w-[260px] rounded bg-slate-100 dark:bg-slate-700" />
      </div>
    </div>
  );
}

// ——— Stat Card ———

interface StatCardProps {
  title: string;
  value: string | number;
  lastMonth: string | number;
  trend?: { value: string; direction: "up" | "down" };
}

function StatCard({ title, value, lastMonth, trend }: StatCardProps) {
  return (
    <Card className="h-[130px] rounded-[20px] border-0 bg-[#FCFCFD] dark:bg-slate-800 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="px-[27px] pt-[14px]">
        <p className="text-[18px] font-normal leading-none text-black dark:text-white">
          {title}
        </p>
        <div className="mt-[10px] flex items-center gap-[7px]">
          <span className="text-[40px] font-semibold leading-none text-black dark:text-white">
            {value}
          </span>
          {trend && (
            <span
              className={`flex items-center gap-[7px] rounded-[36px] px-[10px] py-[5px] text-[15px] font-normal ${
                trend.direction === "up"
                  ? "bg-[#f0f9f5] dark:bg-[#1ea438]/10 text-[#1ea438]"
                  : "bg-[#fcefe9] dark:bg-[#ce3131]/10 text-[#ce3131]"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-[10px] w-[8px]" />
              ) : (
                <TrendingDown className="h-[10px] w-[8px]" />
              )}
              {trend.value}
            </span>
          )}
        </div>
        <p className="mt-[8px] text-[16px] text-black dark:text-slate-300">
          Last month: {lastMonth}
        </p>
      </div>
    </Card>
  );
}

// ——— Async data sections (streamed with Suspense) ———

async function StatsAndPageviews() {
  const [stats, pageviewCountRaw] = await Promise.all([
    getAdminDashboardStats(),
    fetchUniquePageview(),
  ]);

  const pageviewCount =
    pageviewCountRaw.length > 0
      ? pageviewCountRaw
      : [
          { date: "2026-03-14", count: 45 },
          { date: "2026-03-15", count: 32 },
          { date: "2026-03-16", count: 67 },
          { date: "2026-03-17", count: 52 },
          { date: "2026-03-18", count: 78 },
          { date: "2026-03-19", count: 61 },
          { date: "2026-03-20", count: 43 },
        ];

  return (
    <div className="grid grid-cols-[524fr_578fr] items-start gap-[25px]">
      <div className="grid grid-cols-2 gap-5">
        <StatCard
          title="Total Users"
          value={stats.users.current}
          lastMonth={stats.users.lastMonth}
          trend={stats.users.trend}
        />
        <StatCard
          title="Retention Rate"
          value={stats.retentionRate.currentPct}
          lastMonth={stats.retentionRate.lastMonthPct}
          trend={stats.retentionRate.trend}
        />
        <StatCard
          title="Total Droplets"
          value={stats.droplets.current}
          lastMonth={stats.droplets.lastMonth}
          trend={stats.droplets.trend}
        />
        <StatCard
          title="Total Enrollments"
          value={stats.enrollments.current}
          lastMonth={stats.enrollments.lastMonth}
          trend={stats.enrollments.trend}
        />
      </div>
      <UniquePageviewBarChart data={pageviewCount} />
    </div>
  );
}

async function BottomCharts() {
  const [weeklyActiveUsers, sessionDurationRaw] = await Promise.all([
    fetchWeeklyActiveUsers(),
    fetchAvgSessionDuration(),
  ]);

  const sessionDurationData =
    sessionDurationRaw.length > 0
      ? sessionDurationRaw
      : [
          { date: "2026-01-01", duration: 4.2 },
          { date: "2026-01-15", duration: 5.1 },
          { date: "2026-02-01", duration: 3.8 },
          { date: "2026-02-15", duration: 6.3 },
          { date: "2026-03-01", duration: 5.7 },
          { date: "2026-03-10", duration: 7.1 },
          { date: "2026-03-20", duration: 6.5 },
        ];

  return (
    <div className="mt-5 grid grid-cols-[682fr_421fr] gap-5">
      <ActiveUsersChart data={weeklyActiveUsers} />
      <AvgSessionDurationChart data={sessionDurationData} />
    </div>
  );
}

// ——— Page ———

export default function Page() {
  return (
    <div className="w-full px-[56px] py-8">
      {/* Page header — renders immediately */}
      <div className="mb-6">
        <h1 className="text-[40px] font-semibold leading-tight text-black dark:text-white">
          Admin
        </h1>
        <p className="mt-1 text-[20px] text-[#475569] dark:text-slate-400">
          View Odyssey statistics and edit existing information.
        </p>
      </div>

      {/* Top row: stat cards + pageviews — streams in */}
      <Suspense
        fallback={
          <div className="grid grid-cols-[524fr_578fr] items-start gap-[25px]">
            <div className="grid grid-cols-2 gap-5">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <ChartSkeleton />
          </div>
        }
      >
        <StatsAndPageviews />
      </Suspense>

      {/* Bottom row: charts — streams in */}
      <Suspense
        fallback={
          <div className="mt-5 grid grid-cols-[682fr_421fr] gap-5">
            <ChartSkeleton height="h-[396px]" />
            <ChartSkeleton height="h-[396px]" />
          </div>
        }
      >
        <BottomCharts />
      </Suspense>
    </div>
  );
}
