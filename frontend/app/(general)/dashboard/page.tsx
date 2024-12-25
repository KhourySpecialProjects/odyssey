import { MyContent } from "@/components/dashboard/my-content";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Suspense } from "react";

// type Props = {
//   params: Promise<Params>;
// };

// type Params = {
//   slug: string;
//   searchParams: { [key: string]: string | string[] | undefined };
// };

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function DashboardRoute({ searchParams }: Props) {
  // const searchParams = (await params).searchParams;
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          My Content
        </h1>
        <p className="mt-4 text-lg leading-normal text-slate-600 text-balance">
          View and manage your enrolled content
        </p>
      </div>

      <div className="w-full max-w-5xl px-4 mx-auto mb-8 xl:p-0">
        <Suspense fallback={<DropletsSkeleton />}>
          <MyContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
