// components/draft/metadata/general-info.tsx
"use client";

import { Selection } from "@/components/draft/metadata/selection";
import type { Droplet } from "@/types";

type GeneralInfoProps = {
  dropletId: number;
  droplets: Pick<Droplet, "id" | "name" | "slug">[];
  prerequisites: Droplet[];
  postrequisites: Droplet[];
};

export function GeneralInfo({
  dropletId,
  droplets,
  prerequisites,
  postrequisites,
}: GeneralInfoProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        General Info
      </h2>
      <p className="mt-1 text-slate-500 dark:text-slate-300">
        Information that users will see when they view the droplet{" "}
      </p>
      <div className="mt-4 flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-sm text-slate-900 dark:text-white">
            Prerequisite Droplets
          </h2>
          <Selection
            variant="prerequisite"
            dropletId={dropletId}
            items={droplets}
            selectedItems={prerequisites}
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm text-slate-900 dark:text-white">
            Similar Droplets
          </h2>
          <Selection
            variant="postrequisite"
            dropletId={dropletId}
            items={droplets}
            selectedItems={postrequisites}
          />
        </div>
      </div>
    </section>
  );
}
