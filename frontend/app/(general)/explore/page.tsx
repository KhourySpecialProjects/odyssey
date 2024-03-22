import { fetchDroplets } from "@/lib/requests/data";
import { ArrowRightCircleIcon } from "lucide-react";
import Link from "next/link";

type Droplet = {
  id: string;
  name: string;
  type: string;
  slug: string;
};

export default async function ExploreRoute() {
  const droplets = await fetchDroplets();

  return (
    <>
      <div className="my-4 w-full max-w-5xl p-8 mx-auto text-center">
        <h1 className="text-5xl font-bold">Explore</h1>
      </div>

      <div className="space-y-8">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-slate-50 p-8 rounded-md">
            <h2 className="text-xl font-bold">Knowledge Droplets</h2>
            <p className="mt-1 text-slate-800">
              Gain a comprehensive understanding of a specific topic.
            </p>

            <div className="grid md:grid-cols-4 mt-6 gap-4">
              {droplets
                .filter((droplet: Droplet) => droplet.type === "knowledge")
                .map((droplet: Droplet) => (
                  <Link
                    className="flex flex-row justify-between items-center rounded-md bg-slate-100 border border-slate-200 p-4 hover:bg-slate-200 transition-colors"
                    key={droplet.id}
                    href={"/d/" + droplet.slug}
                  >
                    <p className="font-semibold text-lg leading-tight text-slate-700">
                      {droplet.name}
                    </p>
                    <ArrowRightCircleIcon className="w-6 h-6 text-slate-700" />
                  </Link>
                ))}
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-slate-50 p-8 rounded-md">
            <h2 className="text-xl font-bold">Skill Droplets</h2>
            <p className="mt-1 text-slate-800">
              Apply knowledge through guided examples for use in some
              application.
            </p>

            <div className="grid md:grid-cols-4 mt-6 gap-4">
              {droplets
                .filter((droplet: Droplet) => droplet.type === "skill")
                .map((droplet: Droplet) => (
                  <Link
                    className="flex flex-row justify-between items-center rounded-md bg-slate-100 border border-slate-200 p-4 hover:bg-slate-200 transition-colors"
                    key={droplet.id}
                    href={"/d/" + droplet.slug}
                  >
                    <p className="font-semibold text-lg leading-tight text-slate-700">
                      {droplet.name}
                    </p>
                    <ArrowRightCircleIcon className="w-6 h-6 text-slate-700" />
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
