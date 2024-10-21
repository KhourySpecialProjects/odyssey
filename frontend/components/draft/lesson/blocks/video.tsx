"use client";
import { Input } from "@/components/ui/input";
import { PencilIcon, CheckIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useOffClick } from "../../metadata/hooks/useOffClick";
import { updateLesson } from "@/lib/actions";
import { youtubeUrlToEmbeddedUrl, embeddedUrlToYoutubeUrl } from "@/lib/utils";

export function VideoEditor({
  block, 
  updateBlock,
  deleteBlock
}: {
  block : any,
  updateBlock: (block : any) => void,
  deleteBlock: () => void
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
      <div className="w-full flex flex-row  mb-4 justify-between items-center">
        <div className="w-full flex flex-row justify-between items-center mr-4">
            <h2 className="text-lg">Video Block</h2>
            <Trash2Icon className="cursor-pointer text-red-600 hover:text-red-700" onClick={deleteBlock}/>
        </div>
      
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
