"use client";

import dynamic from "next/dynamic";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "katex/dist/katex.min.css";
import type { Block } from "@blocknote/core";
import type { DrawnAnchor } from "@/lib/anchors/editor";

interface BlockNoteEditorProps {
  initialContent?: Block[];
  onChange: (content: Block[]) => void;
  editable?: boolean;
  /** Review comment marks to draw (ODY-806) */
  anchors?: DrawnAnchor[];
}

const BlockNoteEditorClient = dynamic(
  () =>
    import("./blocknote-editor-client").then(
      (mod) => mod.BlockNoteEditorClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-lg border border-[#D0D5DD] p-8 text-center dark:border-slate-600">
        Loading editor...
      </div>
    ),
  },
);

export function BlockNoteEditor({
  initialContent,
  onChange,
  editable,
  anchors,
}: BlockNoteEditorProps) {
  return (
    <BlockNoteEditorClient
      initialContent={initialContent}
      onChange={onChange}
      editable={editable}
      anchors={anchors}
    />
  );
}
