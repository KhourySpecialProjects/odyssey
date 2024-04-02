"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractHeadings } from "@/lib/utils";
import useDebugStore from "@/stores/debug-toggle-store";
import { Lesson } from "@/types";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { ArrowDownFromLineIcon } from "lucide-react";
import { QuizBlock } from "./quiz";

export function LessonRenderer({ lesson }: { lesson: Lesson }) {
  const isDebugEnabled = useDebugStore((state) => state.debugModeEnabled);

  let headings: any[] = [];
  lesson.blocks
    .filter((b: any) => b.__component === "droplets.generic")
    .forEach((b: any) => {
      headings = headings.concat(extractHeadings(b.content));
    });

  return (
    <div className="w-full py-8 mx-auto max-w-prose">
      <h1 className="text-4xl font-extrabold">{lesson.name}</h1>

      <div className="h-8"></div>

      <div className="p-6 border rounded-md md:px-8 lg:-mx-8 bg-slate-50 border-slate-200">
        <h2 className="text-xl font-bold">Contents</h2>
        <ul className="mt-3 ml-4 list-disc list-inside">
          {headings.map((heading, index) => (
            <li
              key={index}
              style={{ marginLeft: `${(heading.level - 2) * 25}px` }}
            >
              {heading.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="h-8"></div>

      <div className="space-y-12">
        {lesson.blocks.map((b: any, i: number) => (
          <LessonBlockRenderer key={i} block={b} />
        ))}
      </div>

      {isDebugEnabled ? (
        <pre className="p-4 mt-4 text-sm break-words whitespace-pre rounded-md bg-slate-100 text-wrap">
          {JSON.stringify(lesson, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function LessonBlockRenderer({ block }: { block: any }) {
  switch (block.__component) {
    case "droplets.generic":
      return (
        <div
          className="mt-4 prose prose-lg prose-sky prose-table:block prose-table:overflow-x-scroll"
          dangerouslySetInnerHTML={{ __html: block.content }}
        ></div>
      );

    case "droplets.video":
      return (
        <div className="mx-auto md:-mx-8">
          <iframe
            width="100%"
            height="400"
            src={block.url}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded YouTube video"
            className="rounded-md"
          />
        </div>
      );

    case "droplets.quiz":
      return <QuizBlock data={block} />;

    case "droplets.callout":
      return (
        <div className="px-6 py-6 border rounded-md md:-mx-8 bg-sky-50 border-sky-200">
          <div className="mx-auto prose prose-sky">
            <BlocksRenderer content={block.content} />
          </div>
        </div>
      );

    case "droplets.expandable":
      return (
        <Collapsible className="w-full p-4 border rounded-md border-slate-200">
          <CollapsibleTrigger className="inline-flex flex-row items-center gap-2 font-bold text-sky-600">
            {block.title}
            <ArrowDownFromLineIcon className="w-4 h-4 text-sky-400" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 mt-4 border-t border-t-slate-200">
            <div
              className="prose prose-sky"
              dangerouslySetInnerHTML={{ __html: block.content }}
            ></div>
          </CollapsibleContent>
        </Collapsible>
      );

    default:
      return null;
  }
}
