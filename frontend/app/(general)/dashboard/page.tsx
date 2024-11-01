import { Enrollments } from "@/components/dashboard/enrollments";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Suspense } from "react";

export default function DashboardRoute() {
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          You are enrolled in the following Droplets.
        </p>
      </div>

      <div className="w-full max-w-5xl px-4 mx-auto mb-8 xl:p-0">
        <Suspense fallback={<DropletsSkeleton />}>
          <Enrollments />
        </Suspense>
      </div>
    </>
  );
}
