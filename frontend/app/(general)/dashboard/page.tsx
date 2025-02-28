import { MyContent } from "@/components/dashboard/my-content";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Suspense } from "react";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardRoute({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight light:text-slate-900 sm:text-4xl">
          My Dashboard
        </h1>
        <p className="mt-4 text-lg leading-normal light:text-slate-600 text-balance">
          View and manage your enrolled content
        </p>
      </div>

      <div className="w-full max-w-5xl px-4 mx-auto mb-8 xl:p-0">
        <Suspense fallback={<DropletsSkeleton />}>
          <MyContent searchParams={params} />
        </Suspense>
      </div>
    </>
  );
}
