"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, type ComponentProps } from "react";
import type { CodeEditor } from "@/components/ui/code-editor";
import { cn } from "@/lib/utils";

type CodeEditorProps = ComponentProps<typeof CodeEditor>;

// next/dynamic's loading component doesn't receive the editor's props, so the
// fallback reads the code to show from context.
const FallbackPropsContext = createContext<CodeEditorProps>({ value: "" });

// Plain-text stand-in sized like the CodeMirror editor (13px monospace, 1.4
// line height, 4px vertical padding, line-number gutter) so layout doesn't jump.
function CodeEditorFallback() {
  const {
    value,
    className,
    minHeight = "60px",
  } = useContext(FallbackPropsContext);
  return (
    <pre
      className={cn(
        "overflow-x-auto bg-white py-1 pr-2 pl-[35px] font-mono text-[13px] leading-[1.4] whitespace-pre text-[#24292e] dark:bg-[#0d1117] dark:text-[#c9d1d9]",
        className,
      )}
      style={{ minHeight }}
    >
      {value}
    </pre>
  );
}

const DynamicCodeEditor = dynamic(
  () => import("@/components/ui/code-editor").then((mod) => mod.CodeEditor),
  { ssr: false, loading: () => <CodeEditorFallback /> },
);

/**
 * CodeEditor loaded on demand, for lesson viewers where CodeMirror and its
 * language packages shouldn't be in the initial bundle. Same props as
 * CodeEditor; shows the code as plain text until the editor has loaded.
 */
export function LazyCodeEditor(props: CodeEditorProps) {
  return (
    <FallbackPropsContext.Provider value={props}>
      <DynamicCodeEditor {...props} />
    </FallbackPropsContext.Provider>
  );
}
