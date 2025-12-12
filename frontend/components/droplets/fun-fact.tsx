import { ArrowRightIcon } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { Droplet } from "@/types";

export function FunFact({ droplet }: { droplet: Droplet }) {
  return (
    <div className="mt-12 flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-500 dark:bg-slate-800">
      <p className="text-left text-lg text-slate-600 dark:text-slate-300">
        <strong className="mr-2 text-2xl text-black dark:text-slate-300">
          Did you know?
        </strong>
        {droplet?.funFact}
      </p>
      <Link className="w-full" href={`/d/${droplet.slug}`}>
        <Button className="h-auto w-full bg-sky-200 text-lg text-slate-900 hover:scale-105 hover:bg-sky-200 md:w-1/2 dark:bg-blue-400 dark:hover:bg-blue-400">
          <p className="text-wrap whitespace-normal">
            Dive deeper in <strong className="">{droplet.name}</strong>
          </p>
          <ArrowRightIcon />
        </Button>
      </Link>
    </div>
  );
}
