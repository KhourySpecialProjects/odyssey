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
// loads. Matches CodeEditor (github themes, no fold gutter) as rendered: 13px
// monospace (CodeMirror's `monospace`, not Tailwind's font-mono stack), 1.4
// line height, 4px vertical padding, code 6px after the gutter, #888
// placeholder. Gutter: numbers right-aligned with 5px/3px padding and at least
// 20px wide, so it widens with the digit count like CodeMirror's; line 1 has
// the active-line highlight; a 1px border in light mode only (dark mode uses
// CodeMirror's base gutter colours, which githubDark doesn't override).
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
        "flex overflow-x-auto bg-white font-[monospace] text-[13px] leading-[1.4] text-[#24292e] dark:bg-[#0d1117] dark:text-[#c9d1d9]",
        className,
      )}
      style={{ minHeight }}
    >
      <div
        aria-hidden="true"
        className="shrink-0 border-r border-[#ddd] py-1 text-right text-[#6e7781] select-none dark:border-r-0 dark:bg-[#333338] dark:text-[#ccc]"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={cn(
              "min-w-[20px] pr-[3px] pl-[5px]",
              i === 0 && "bg-[#e2f2ff] dark:bg-[#36334280]",
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>
      {/* The dark: colours repeat what's inherited because globals.css sets
          `.dark pre, .dark pre *` to white */}
      <pre className="m-0 flex-1 bg-transparent py-1 pr-[2px] pl-[6px] font-[inherit] whitespace-pre text-inherit dark:text-[#c9d1d9]">
        {value || (
          <span className="text-[#888] dark:text-[#888]">{placeholder}</span>
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
