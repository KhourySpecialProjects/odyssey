"use client";

import { Lesson } from "@/types";
import TipTap from "@/components/ui/tiptap";
import { ExpandableEditor } from "@/components/draft/lesson/blocks/expandable";
import { VideoEditor } from "@/components/draft/lesson/blocks/video";
import { CalloutEditor } from "./blocks/callout";
import { GenericEditor } from "./blocks/generic";
import { AddBlock } from "./add-block";
import { useState, useCallback, useEffect } from 'react';
import { debounce } from "lodash";
import { updateLesson } from "@/lib/actions";

export function LessonRenderer({ lesson }: { lesson: Lesson }) {
  
  const [blocks, setBlocks] = useState(lesson.blocks.map((block) => { 
    delete block.id;
    return block;
  })); 

  const setBlock = useCallback(
    (index: number) => {
      return (block: any) => {
        setBlocks((prevBlocks) =>
          prevBlocks.map((b, i) => (i === index ? {...b, ...block, } : b))
        );
      };
    },
    [] // Add blocks as a dependency
  );

  const addBlock = useCallback(
    (index: number) => {
        return (block : any) => {
            const updatedBlocks = [...blocks];
            updatedBlocks.splice(index, 0, block);
            setBlocks(updatedBlocks)
            
        }
    }, []
  )
  
  useEffect(() => {
    debounceUpdate(blocks);
  }, [blocks])

  const updateBackend = async (blocks: any) => {
    const response = await updateLesson(
        lesson.id,
        { blocks: blocks },
        false,
      );
    console.log(response)
  }  

  const debounceUpdate = useCallback(debounce(updateBackend, 1000), []);
  
  return (
    <>
      <h1 className="text-4xl font-extrabold text-balance mb-10">
        {lesson.name}
      </h1>
      <div className="space-y-12"></div>

      <div className="space-y-4 w-full flex flex-col items-center justify-center">
        <AddBlock blocks={lesson.blocks} lessonId={lesson.id} index={0} />
        {blocks.map((block, i) => (
          <div
            key={i}
            className="w-full flex flex-col items-center justify-center max-w-2xl space-y-4"
          >
            {block.__component === "droplets.generic" && (
              <GenericEditor
                block={block}
                updateBlock={setBlock(i)}

              />
            )}
            {block.__component === "droplets.expandable" && (
              <ExpandableEditor
                block={block}
                updateBlock={setBlock(i)}
              />
            )}
            {block.__component === "droplets.video" && (
              <VideoEditor
              block={block}
              updateBlock={setBlock(i)}
              />
            )}
            {block.__component === "droplets.callout" && (
              <CalloutEditor
                block = {block}
                updateBlock={setBlock(i)}
              />
            )}
            <AddBlock
              blocks={lesson.blocks}
              lessonId={lesson.id}
              index={i + 1}
            />
          </div>
        ))}
      </div>
    </>
  );
}
