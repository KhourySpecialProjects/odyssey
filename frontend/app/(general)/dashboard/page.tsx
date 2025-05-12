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
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="light:text-slate-600 mt-4 text-lg leading-normal text-balance">
          View and manage your enrolled content
        </p>
      </div>

      <div className="mx-auto mb-8 w-full max-w-5xl px-4 xl:p-0">
        <Suspense fallback={<DropletsSkeleton />}>
          <MyContent searchParams={params} />
        </Suspense>
      </div>
    </>
  );
}
