import { getTags } from "@/lib/requests/tag";
import { Filter } from "./filter";

export async function TagFilter() {
  const tags = await getTags({ populate: { droplets: { fields: "id" } } }).then(
    (tags) => {
      return tags.map((tag) => {
        return {
          label: tag.title,
          value: tag.slug,
          count: tag.droplets.length,
        };
      });
    }
  );

  return <Filter name="tags" label="Tags" options={tags} />;
}
