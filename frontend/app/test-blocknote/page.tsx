"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import BlockNote components with no SSR
const BlockNoteEditor = dynamic(
  () => import("@/components/ui/blocknote/editor/block-note-test-editor"),
  { ssr: false },
);

export default function TestBlockNotePage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8 dark:bg-slate-900">
        <div className="text-slate-600">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            BlockNote Callout Test
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Type "/" to see callout options: warning, question, important,
            definition, more-information, caution, default
          </p>
        </div>

        <BlockNoteEditor />
      </div>
    </div>
  );
}
