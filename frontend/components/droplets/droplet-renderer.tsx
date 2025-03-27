"use client";

import useDebugStore from "@/stores/debug-toggle-store";

export function DropletRenderer({ droplet }: any) {
  return (
    <div className="w-full mx-auto max-w-prose">
      <p className="p-4 -mx-4 rounded-md bg-slate-50 text-slate-700">
        You are viewing the <strong>{droplet.name}</strong> {droplet.type}{" "}
        Droplet in the {droplet.focusArea} focus area.
      </p>

      <div className="h-8"></div>

      {droplet.lessons[0].blocks.map((b: any, i: number) => (
        <LessonBlockRenderer key={i} block={b} />
      ))}
    </div>
  );
}

function LessonBlockRenderer({ block }: { block: any }) {
  switch (block.__content) {
    case "droplets.video":
      return (
        <iframe
          width="80%"
          height="480"
          style={{ display: "flex", margin: "auto" }}
          src={`${block.url}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Embedded YouTube video"
        />
      );

    default:
      return null;
  }
}
