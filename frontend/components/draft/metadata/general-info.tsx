// components/draft/metadata/general-info.tsx

import { Selection } from "@/components/draft/metadata/selection";
import type { Droplet, Tag } from "@/types";

type GeneralInfoProps = {
  dropletId: number;
  tags: Tag[];
  selectedTags: Tag[];
  droplets: Pick<Droplet, "id" | "name" | "slug">[];
  prerequisites: Pick<Droplet, "id" | "name" | "slug">[];
  postrequisites: Pick<Droplet, "id" | "name" | "slug">[];
};

export function GeneralInfo({
  dropletId,
  tags,
  selectedTags,
  droplets,
  prerequisites,
  postrequisites,
}: GeneralInfoProps) {
  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        General Info
      </h1>
      <p className="mb-8 text-slate-500 dark:text-slate-300">
        Information that users will see when they view the droplet{" "}
      </p>
      <div className="flex w-full flex-col space-y-4">
        <Selection
          variant="tag"
          dropletId={dropletId}
          items={tags}
          selectedItems={selectedTags}
        />
        <Selection
          variant="prerequisite"
          dropletId={dropletId}
          items={droplets}
          selectedItems={prerequisites}
        />
        <Selection
          variant="postrequisite"
          dropletId={dropletId}
          items={droplets}
          selectedItems={postrequisites}
        />
      </div>
    </section>
  );
}