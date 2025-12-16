import { Droplet, Tag } from "@/types/index.d";
import { Badge } from "@/components/ui/badge";
import { cn, uppercaseFirstChar } from "@/lib/utils";

export default function DraggableDropletWideTile({
  droplet,
}: {
  droplet: Droplet;
}) {
  return (
    <div
      className={cn(
        "relative rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800",
      )}
    >
      <div className="p-4">
        <div className="flex flex-col justify-end gap-2">
          <div className="flex flex-0 flex-row flex-wrap gap-1.5">
            {droplet.status === "draft" && (
              <Badge variant="destructive">Draft</Badge>
            )}
            <Badge variant="default" className="dark:bg-purple-800">
              {uppercaseFirstChar(droplet.focusArea)}
            </Badge>
            <Badge
              variant="secondary"
              className="dark:bg-slate-700 dark:text-white"
            >
              {uppercaseFirstChar(droplet.type)}
            </Badge>
            {droplet.tags?.map((tag: Tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
          <span className="block w-full place-self-end pt-2 pl-1 text-xl font-black text-slate-950 dark:text-slate-300">
            {droplet.name}
          </span>
        </div>
      </div>
    </div>
  );
}
