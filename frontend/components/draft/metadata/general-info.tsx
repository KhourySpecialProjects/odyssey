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
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Information that users will see when they view the droplet{" "}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm text-slate-600 dark:text-slate-300">
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
          <h2 className="mb-2 text-sm text-slate-600 dark:text-slate-300">
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
