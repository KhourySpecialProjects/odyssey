"use client";

import dynamic from "next/dynamic";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "katex/dist/katex.min.css";
import type { Block } from "@blocknote/core";

interface BlockNoteEditorProps {
  initialContent?: Block[];
  onChange: (content: Block[]) => void;
}

const BlockNoteEditorClient = dynamic(
  () =>
    import("./blocknote-editor-client").then(
      (mod) => mod.BlockNoteEditorClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-lg border border-slate-200 p-8 text-center dark:border-slate-700">
        Loading editor...
      </div>
    ),
  },
);

export function BlockNoteEditor({
  initialContent,
  onChange,
}: BlockNoteEditorProps) {
  return (
    <BlockNoteEditorClient
      initialContent={initialContent}
      onChange={onChange}
    />
  );
}
