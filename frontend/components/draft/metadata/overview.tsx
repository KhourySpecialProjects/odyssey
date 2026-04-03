"use client";

import { useDropletUpdate } from "./hooks/useDropletUpdate";
import { DropletOverviewInput } from "@/components/ui/tiptap/droplet-overview-input";
import { useCallback, useRef, useState } from "react";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Overview({
  dropletId,
  initialContent,
}: {
  dropletId: number;
  initialContent: string;
}) {
  const { error, handleChange } = useDropletUpdate(dropletId);
  const editorActionsRef = useRef<{
    setLink: () => void;
    unsetLink: () => void;
  } | null>(null);
  const [isLink, setIsLink] = useState(false);

  const onIsLinkChange = useCallback((val: boolean) => setIsLink(val), []);

  return (
    <section className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Overview
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Longer summary of droplet
          </p>
        </div>
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => editorActionsRef.current?.setLink()}
                  className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${
                    isLink
                      ? "border-blue-600 bg-blue-500 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  <IconLink className="h-4 w-4" stroke={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Set link</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => editorActionsRef.current?.unsetLink()}
                  disabled={!isLink}
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  <IconLinkOff className="h-4 w-4" stroke={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Unset link</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <DropletOverviewInput
          updateContent={(content: string) =>
            handleChange({ overview: content })
          }
          initialContent={initialContent}
          editorActionsRef={editorActionsRef}
          onIsLinkChange={onIsLinkChange}
        />
      </div>
      {error && <div className="mt-2 text-red-500">{error}</div>}
    </section>
  );
}
