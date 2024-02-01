import { fetchDroplets } from "@/lib/data";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

type Droplet = {
  id: string;
  name: string;
  type: string;
  slug: string;
};

export default async function HomeRoute() {
  const droplets = await fetchDroplets();

  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <h1 className="text-4xl font-bold">Welcome to Khoury Odyssey!</h1>
      <h2 className="mt-4 font-bold">Droplets Overview</h2>
      <p>Check out some droplets:</p>

      <div className="bg-slate-100 rounded-md">
        <ul className="mt-4 flex flex-col divide-y divide-gray-200">
          {droplets.map((droplet: Droplet) => (
            <Link key={droplet.id} href={"/d/" + droplet.slug}>
              <li className="inline-flex items-center hover:underline [&:not(:first-child)]:pt-3 transition-colors rounded-md py-2 px-4 gap-2">
                <p>
                  <span className="font-medium">{droplet.name}</span> (
                  {droplet.type})
                </p>
                <ArrowRightIcon className="w-4" />
              </li>
            </Link>
          ))}
        </ul>
      </div>
    </div>
  );
}
