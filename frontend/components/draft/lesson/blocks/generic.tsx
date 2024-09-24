'use client';
import { useCallback } from "react";
import { debounce } from "lodash";
import { updateLesson } from "@/lib/actions";
import TipTap from "@/components/ui/tiptap";

export function GenericEditor({ blocks, id, lessonId } : { blocks: any, id: number, lessonId: number }) {
    const block = blocks.find((b : any) => b.id === id);

    const updateBackend = async (content: any) => {
        const updatedBlocks = blocks.map((b: any) => {
            if (b.id === id) {
                return {
                    __component: 'droplets.generic',
                    content: content,
                };
            }
            return b;
        });
        const response = await updateLesson(lessonId, {blocks: updatedBlocks});
        console.log(response);
    }

    const debounceUpdate = useCallback(debounce(updateBackend, 1000), []);

    return (
        <TipTap variant="lesson-generic" initialContent={block.content} updateContent={debounceUpdate}/>
    );
}