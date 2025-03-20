import { getTags } from "@/lib/requests/tag";
import { Filter } from "./filter";

export async function TagFilter() {
  const tags = await getTags({ populate: { droplets: { fields: "id" } } }).then(
    (tags) => {
      return tags.map((tag) => {
        return {
          label: tag.name,
          value: tag.slug,
          count: tag.droplets.filter(
            (droplet) => !droplet.isHidden && droplet.status === "published",
          ).length,
        };
      });
    },
  );

  return <Filter name="tags" label="Tags" options={tags} data-testid="tag-filter-label"/>;
}
