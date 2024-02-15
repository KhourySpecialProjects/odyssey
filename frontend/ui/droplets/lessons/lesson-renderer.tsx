"use client";

import { extractHeadings } from "@/lib/utils";
import useDebugStore from "@/stores/debug-store";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";

export function LessonRenderer({ lesson }: any) {
  const isDebugEnabled = useDebugStore((state) => state.debug);

  let headings: any[] = [];
  lesson.blocks
    .filter((b: any) => b.__component === "droplets.generic")
    .forEach((b: any) => {
      headings = headings.concat(extractHeadings(b.content));
    });

  return (
    <div className="w-full py-8 mx-auto max-w-prose">
      <h1 className="text-4xl font-extrabold">{lesson.title}</h1>

      <div className="h-8"></div>

      <div className="bg-purple-50 py-6 px-8 -mx-8 rounded-md border border-purple-200">
        <h2 className="font-bold text-xl">Contents</h2>
        <ul className="ml-4 mt-3 list-disc list-inside">
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
          className="mt-4 prose prose-lg"
          dangerouslySetInnerHTML={{ __html: block.content }}
        ></div>
      );

    case "droplets.callout":
      return (
        <div className="bg-purple-100 -mx-8 py-6 px-6 rounded-md border border-purple-200">
          <BlocksRenderer content={block.content} />
        </div>
      );

    case "droplets.video":
      return (
        <iframe
          width="100%"
          height="400"
          style={{ display: "flex", margin: "auto" }}
          src={`${block.url}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Embedded YouTube"
          className="rounded-md"
        />
      );

    default:
      return null;
  }
}
