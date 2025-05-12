"use client";

import { Block } from "../draft/lesson/add-block";

interface DropletProps {
  droplet: {
    name: string;
    type: string;
    focusArea: string;
    lessons: {
      blocks: Block[];
    }[];
  };
}

export function DropletRenderer({ droplet }: DropletProps) {
  return (
    <div className="mx-auto w-full max-w-prose">
      <p className="-mx-4 rounded-md bg-slate-50 p-4 text-slate-700">
        You are viewing the <strong>{droplet.name}</strong> {droplet.type}{" "}
        Droplet in the {droplet.focusArea} focus area.
      </p>

      <div className="h-8"></div>

      {droplet.lessons[0].blocks.map((b: Block, i: number) => (
        <LessonBlockRenderer key={i} block={b} />
      ))}
    </div>
  );
}

function LessonBlockRenderer({ block }: { block: Block }) {
  switch (block.__component) {
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
