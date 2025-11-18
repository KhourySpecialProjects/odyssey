"use client";

import dynamic from "next/dynamic";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface BlockNoteEditorProps {
  initialContent?: any;
  onChange: (content: any) => void;
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
