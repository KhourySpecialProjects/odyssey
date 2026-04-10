import { Droplet, Tag } from "@/types/index.d";
import { Badge } from "@/components/ui/badge";
import { cn, uppercaseFirstChar, getDifficultyBadgeColor } from "@/lib/utils";
import { getTagColors } from "@/lib/tag-colors";
import { Plus, XCircleIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DraggableDropletWideTile({
  droplet,
  onAction,
  actionType,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
}: {
  droplet: Droplet;
  onAction?: () => void;
  actionType?: "add" | "remove";
  index?: number;
  totalItems?: number;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}) {
  const isReorderable =
    actionType === "remove" &&
    index !== undefined &&
    totalItems !== undefined &&
    onMoveUp &&
    onMoveDown;

  return (
    <div className={cn("relative flex items-start", isReorderable && "gap-3")}>
      {isReorderable && (
        <div className="flex flex-col gap-1 pt-4">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className={cn(
              "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              index === 0 && "cursor-not-allowed opacity-30",
            )}
            aria-label="Move up"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === totalItems - 1}
            className={cn(
              "rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              index === totalItems - 1 && "cursor-not-allowed opacity-30",
            )}
            aria-label="Move down"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="group relative flex-1 overflow-hidden rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex items-center p-3">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-row flex-wrap gap-1.5">
              {droplet.status === "draft" && (
                <span className="inline-flex items-center rounded-[16px] bg-slate-200 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium text-slate-600 opacity-90 dark:bg-slate-600 dark:text-slate-300">
                  Draft
                </span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "pointer-events-none rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                  getTagColors(droplet.focusArea).bg,
                  getTagColors(droplet.focusArea).text,
                )}
              >
                {uppercaseFirstChar(droplet.focusArea)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "pointer-events-none rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                  getTagColors(droplet.type).bg,
                  getTagColors(droplet.type).text,
                )}
              >
                {uppercaseFirstChar(droplet.type)}
              </Badge>
              {droplet.tags?.map((tag: Tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={cn(
                    "pointer-events-none rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                    getTagColors(tag.name).bg,
                    getTagColors(tag.name).text,
                  )}
                >
                  {tag.name}
                </Badge>
              ))}
              {droplet.difficulty && (
                <Badge
                  className={cn(
                    "pointer-events-none rounded-[16px] border-0 px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                    getDifficultyBadgeColor(droplet.difficulty),
                  )}
                  variant="outline"
                >
                  {uppercaseFirstChar(droplet.difficulty)}
                </Badge>
              )}
            </div>
            <span className="block w-full text-base font-bold text-slate-950 dark:text-slate-300">
              {droplet.name}
            </span>
          </div>
          {onAction && actionType === "add" && (
            <button
              type="button"
              onClick={onAction}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition-colors hover:bg-slate-200 dark:border-slate-500 dark:text-slate-400 dark:hover:bg-slate-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {onAction && actionType === "remove" && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onAction}
              className="text-slate-400 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-red-500 focus:opacity-100 focus-visible:opacity-100"
            >
              <XCircleIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
