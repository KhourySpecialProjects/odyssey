"use client";
import { Input } from "@/components/ui/input";
import { PencilIcon, CheckIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useOffClick } from "../../metadata/hooks/useOffClick";
import { updateLesson } from "@/lib/actions";
import { youtubeUrlToEmbeddedUrl, embeddedUrlToYoutubeUrl } from "@/lib/utils";

export function VideoEditor({
  block, 
  updateBlock
}: {
  block : any,
  updateBlock: (block : any) => void
}) {
  const ref = useRef(null);
  const { open, setOpen } = useOffClick(ref);
  const [url, setUrl] = useState(embeddedUrlToYoutubeUrl(block.url));

  /*
  const updateBackend = async (url: string) => {
    const updatedBlocks = blocks.map((b: any) => {
      if (b.id === id) {
        return {
          __component: "droplets.video",
          url: url,
        };
      }
      return b;
    });
    const response = await updateLesson(
      lessonId,
      { blocks: updatedBlocks },
      false,
    );
    console.log(response);
  };
  */

  return (
    <div
      className={
        "w-full text-lg rounded border hover:shadow border-slate-200 p-4 " +
        (open ? "shadow-md" : "")
      }
      ref={ref}
    >
      <div className="flex items-center justify-between mb-4">
        <h2>Video Block</h2>
        {open ? (
          <CheckIcon
            className="cursor-pointer text-slate-700 hover:text-slate-800"
            onClick={() => {
              setOpen(false);
              updateBlock( {
                __component: "droplets.video",
                url: youtubeUrlToEmbeddedUrl(url),
              });
            }}
          />
        ) : (
          <PencilIcon
            className="cursor-pointer text-slate-700 hover:text-slate-800"
            onClick={() => setOpen(true)}
          />
        )}
      </div>
      {open ? (
        <Input value={url} onChange={(e) => setUrl(e.target.value)} />
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
