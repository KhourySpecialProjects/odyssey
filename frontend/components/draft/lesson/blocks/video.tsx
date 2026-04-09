"use client";
import { Input } from "@/components/ui/input";
import { PencilIcon, CheckIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useOffClick } from "../../metadata/hooks/useOffClick";
import { youtubeUrlToEmbeddedUrl } from "@/lib/utils";

export type VideoBlock = {
  __component: "droplets.video";
  url: string;
};

export function VideoEditor({
  block,
  updateBlock,
  deleteBlock,
}: {
  block: VideoBlock;
  updateBlock: (block: VideoBlock) => void;
  deleteBlock: () => void;
}) {
  const ref = useRef(null);
  const { open, setOpen } = useOffClick(ref, () => {}, true);
  const [url, setUrl] = useState(block.url);

  return (
    <div
      className={
        "w-full rounded border border-[#D0D5DD] p-4 text-lg hover:shadow dark:border-slate-600" +
        (open ? "shadow-md" : "")
      }
      ref={ref}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="mb-4 flex w-full flex-row items-center justify-between">
          <div className="mr-4 flex w-full flex-row items-center justify-between">
            <h2 className="text-lg">Video Block</h2>
            <Trash2Icon
              className="cursor-pointer text-red-600 hover:text-red-700"
              onClick={deleteBlock}
              role="trash"
            />
          </div>

          {open ? (
            <CheckIcon
              className="cursor-pointer text-slate-700 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-400"
              onClick={() => {
                setOpen(false);
                updateBlock({
                  __component: "droplets.video",
                  url: youtubeUrlToEmbeddedUrl(url),
                });
              }}
              role="button"
              aria-label="save"
            />
          ) : (
            <PencilIcon
              className="cursor-pointer text-slate-700 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-400"
              onClick={() => setOpen(true)}
              role="button"
              aria-label="edit"
              name="edit"
            />
          )}
        </div>
      </div>

      {open ? (
        <Input
          value={url}
          placeholder="Enter URL here"
          onChange={(e) => setUrl(e.target.value || "www.youtube.com/")}
        />
      ) : (
        <iframe
          width="100%"
          height="400"
          src={block.url}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Embedded YouTube video"
          className="rounded-md"
        />
      )}
    </div>
  );
}
