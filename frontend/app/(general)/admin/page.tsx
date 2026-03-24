import { Suspense } from "react";
import {
  fetchAvgSessionDuration,
  fetchUniquePageview,
  fetchDailyActiveUsers,
} from "@/lib/requests/posthog";
import { getAdminDashboardStats } from "@/lib/requests/admin-stats";
import { Card } from "@/components/ui/card";
import { ActiveUsersChart } from "@/components/admin/charts/active-users-chart";
import { AvgSessionDurationChart } from "@/components/admin/charts/avg-session-duration-chart";
import { UniquePageviewBarChart } from "@/components/admin/charts/unique-pageview-chart";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { RefreshButton } from "@/components/admin/refresh-button";

export const dynamic = "force-dynamic";

// ——— Skeletons ———

function StatCardSkeleton() {
  return (
    <div className="h-[130px] animate-pulse rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800">
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
      className={`${height} animate-pulse rounded-[20px] bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800`}
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
    <Card className="h-[130px] rounded-[20px] border-0 bg-[#FCFCFD] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] dark:bg-slate-800">
      <div className="px-[27px] pt-[14px]">
        <p className="text-[18px] leading-none font-normal text-black dark:text-white">
          {title}
        </p>
        <div className="mt-[10px] flex items-center gap-[7px]">
          <span className="text-[40px] leading-none font-semibold text-black dark:text-white">
            {value}
          </span>
          {trend && (
            <span
              className={`flex items-center gap-[7px] rounded-[36px] px-[10px] py-[5px] text-[15px] font-normal ${
                trend.direction === "up"
                  ? "bg-[#f0f9f5] text-[#1ea438] dark:bg-[#1ea438]/10"
                  : "bg-[#fcefe9] text-[#ce3131] dark:bg-[#ce3131]/10"
              }`}
            >
              {trend.direction === "up" ? (
                <IconTrendingUp className="h-[10px] w-[8px]" />
              ) : (
                <IconTrendingDown className="h-[10px] w-[8px]" />
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
      <UniquePageviewBarChart data={pageviewCountRaw} />
    </div>
  );
}

async function BottomCharts() {
  const [dailyActiveUsers, sessionDurationRaw] = await Promise.all([
    fetchDailyActiveUsers(),
    fetchAvgSessionDuration(),
  ]);

  return (
    <div className="mt-5 grid grid-cols-[682fr_421fr] gap-5">
      <ActiveUsersChart data={dailyActiveUsers} />
      <AvgSessionDurationChart data={sessionDurationRaw} />
    </div>
  );
}

// ——— Page ———

export default function Page() {
  return (
    <div className="w-full px-[56px] py-8">
      {/* Page header — renders immediately */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[40px] leading-tight font-semibold text-black dark:text-white">
            Admin
          </h1>
          <p className="mt-1 text-[20px] text-[#475569] dark:text-slate-400">
            View Odyssey statistics and edit existing information.
          </p>
        </div>
        <RefreshButton />
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
