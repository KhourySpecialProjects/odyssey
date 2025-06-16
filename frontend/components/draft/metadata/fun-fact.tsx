"use client";

import { Button } from "@/components/ui/button";
import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { DropletOverviewInput } from "@/components/ui/tiptap/droplet-overview-input";

export function FunFact({
    factText,
}: {
    factText: string;
}) {

    return (
        <section className="w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Fun Fact
            </h2>
            <p className="text-slate-500 dark:text-slate-300">
                This AI-generated fact will be displayed to users on Odyssey's homepage
            </p>

            <div className="mt-4 w-full rounded-md border border-slate-200 bg-slate-50 p-8 dark:border-slate-500 dark:bg-slate-800">
                <div
                    className="prose prose-sky prose-code:text-inherit prose-strong:text-inherit prose-headings:text-inherit mx-auto dark:text-slate-300"
                >{factText}</div>
            </div>

            

        </section>
    );
}
