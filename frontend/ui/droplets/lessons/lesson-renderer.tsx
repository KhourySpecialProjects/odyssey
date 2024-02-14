"use client";

import useDebugStore from "@/stores/debug-store";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";

export function LessonRenderer({ lesson }: any) {
  const isDebugEnabled = useDebugStore((state) => state.debug);

  return (
    <div className="w-full py-8 mx-auto max-w-prose">
      <h1 className="text-4xl font-extrabold">{lesson.title}</h1>

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
        <div className="bg-purple-100 py-3 px-4 rounded-md border border-purple-200">
          <div>
            <BlocksRenderer content={block.content} />
          </div>
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
