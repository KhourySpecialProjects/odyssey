"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, type ComponentProps } from "react";
import type { CodeEditor } from "@/components/ui/code-editor";
import { cn } from "@/lib/utils";

type CodeEditorProps = ComponentProps<typeof CodeEditor>;

// next/dynamic's loading component doesn't receive the editor's props, so the
// fallback reads the code to show from context.
const FallbackPropsContext = createContext<CodeEditorProps>({ value: "" });

// Plain-text stand-in drawn like the CodeMirror editor so nothing jumps when it
// loads: 13px monospace (CodeMirror's `monospace`, not Tailwind's font-mono
// stack), 1.4 line height, 4px vertical padding, and the same line-number
// gutter (28px + 1px border, then 6px before the code) and placeholder text.
function CodeEditorFallback() {
  const {
    value,
    className,
    minHeight = "60px",
    placeholder,
  } = useContext(FallbackPropsContext);
  const lineCount = value ? value.split("\n").length : 1;
  return (
    <div
      className={cn(
        "flex overflow-x-auto bg-white py-1 font-[monospace] text-[13px] leading-[1.4] text-[#24292e] dark:bg-[#0d1117] dark:text-[#c9d1d9]",
        className,
      )}
      style={{ minHeight }}
    >
      <div
        aria-hidden="true"
        className="w-[29px] shrink-0 border-r border-[#ddd] pr-[3px] text-right text-[#6e7781] select-none dark:border-slate-700"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="m-0 flex-1 bg-transparent pr-2 pl-[6px] font-[inherit] whitespace-pre text-inherit">
        {value || (
          <span className="text-slate-400 dark:text-slate-500">
            {placeholder}
          </span>
        )}
      </pre>
    </div>
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
