import { Droplet, Tag } from "@/types/index.d";
import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

export default function DraggableDropletWideTile({
  droplet,
  onAction,
  actionType,
}: {
  droplet: Droplet;
  onAction?: () => void;
  actionType?: "add" | "remove";
}) {
  return (
    <div className="relative rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
      <div className="flex items-center p-4">
        <div className="flex flex-1 flex-col justify-end gap-2">
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
        {onAction && actionType && (
          <button
            type="button"
            onClick={onAction}
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition-colors hover:bg-slate-200 dark:border-slate-500 dark:text-slate-400 dark:hover:bg-slate-600"
          >
            {actionType === "add" ? (
              <Plus className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
