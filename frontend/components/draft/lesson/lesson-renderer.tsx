'use client';

import { Lesson } from '@/types';
import TipTap from '@/components/ui/tiptap';
import { ExpandableEditor } from '@/components/draft/lesson/blocks/expandable';
import { VideoEditor } from '@/components/draft/lesson/blocks/video';
import { CalloutEditor } from './blocks/callout';
import { GenericEditor } from './blocks/generic';

export function LessonRenderer ({ lesson } : { lesson: Lesson }) {
    console.log(lesson.blocks );
    return (
        <>
            <h1 className="text-4xl font-extrabold text-balance mb-10">{lesson.name}</h1>
            <div className="space-y-12">
            
            </div>
            
            {lesson.blocks.map((block, i) => (
            <div key={i} className="w-full flex flex-col items-center justify-center max-w-2xl">
                
                {block.__component === 'droplets.generic' && (
                    <GenericEditor blocks={lesson.blocks} id={block.id} lessonId={lesson.id}/>
                )}
                {block.__component === 'droplets.expandable' && (
                    <ExpandableEditor blocks={lesson.blocks} id={block.id} lessonId={lesson.id}/>
                )}
                {block.__component === 'droplets.video' && (
                    <VideoEditor blocks={lesson.blocks} id={block.id} lessonId={lesson.id}/>
                )}
                {block.__component === 'droplets.callout' && (
                    <CalloutEditor blocks={lesson.blocks} id={block.id} lessonId={lesson.id}/>
                )}
            </div>
            ))}
            
                
                
            
        </>
    );

}