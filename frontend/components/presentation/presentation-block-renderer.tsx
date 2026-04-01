"use client";

/**
 * Block renderer for presentation mode.
 * Dispatches to existing quiz/code/callout components where possible.
 * Generic (HTML) blocks are rendered with prose styles + LaTeX processing.
 * Highlight/note functionality is intentionally stripped — read-only display only.
 */
import { useEffect, useRef } from "react";
import { Block } from "@/types";
import { QuizBlock } from "@/components/droplets/lessons/quiz";
import { OpenEndedQuizBlock } from "@/components/droplets/lessons/open-ended-quiz";
import { CodeBlockViewer } from "@/components/draft/lesson/code-block-viewer";
import { CalloutIcon } from "@/components/ui/callout-icons";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
import { TableRenderer } from "@/components/droplets/lessons/table-renderer";
import DOMPurify from "isomorphic-dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import dynamic from "next/dynamic";
import { parseSandpackFiles } from "@/lib/utils";

const SandpackViewer = dynamic(
  () =>
    import("@/components/draft/lesson/sandpack-viewer").then(
      (mod) => mod.SandpackViewer,
    ),
  { ssr: false },
);

import { NotebookCodeViewer } from "@/components/notebook/notebook-code-viewer";

interface PresentationBlockRendererProps {
  block: Block;
  lessonId?: number;
}

// Process LaTeX markers left inside generic block HTML ($ ... $ and $$ ... $$)
function processLatexInHtml(content: string): string {
  // Display-mode LaTeX: $$...$$
  content = content.replace(/\$\$(.*?)\$\$/g, (_match, latex) => {
    try {
      return `<div class="my-4 flex justify-center">${katex.renderToString(latex, { throwOnError: false, displayMode: true })}</div>`;
    } catch {
      return _match;
    }
  });

  // Inline LaTeX: $...$
  content = content.replace(/\$([^$\n]+?)\$/g, (_match, latex) => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return _match;
    }
  });

  return content;
}

/**
 * Renders a `droplets.generic` block's HTML content.
 * Tables are detected and rendered via TableRenderer.
 * LaTeX markers are processed via KaTeX.
 */
function GenericBlockDisplay({
  block,
}: {
  block: Extract<Block, { __component: "droplets.generic" }>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Check for embedded table data
  const tableMatch = block.content.match(
    /<!--TABLE_START-->([\s\S]*?)<!--TABLE_END-->/,
  );
  let tableData = null;
  try {
    tableData = tableMatch ? JSON.parse(tableMatch[1]) : null;
  } catch {
    // ignore parse error
  }
  const nonTableContent = tableMatch
    ? block.content.replace(/<!--TABLE_START-->[\s\S]*?<!--TABLE_END-->/, "")
    : block.content;

  useEffect(() => {
    if (!contentRef.current || !nonTableContent) return;
    const processed = processLatexInHtml(nonTableContent);
    contentRef.current.innerHTML = DOMPurify.sanitize(processed, {
      ADD_TAGS: [
        "math",
        "semantics",
        "mrow",
        "mi",
        "mo",
        "mn",
        "mfrac",
        "msup",
        "msub",
        "mtext",
      ],
      ADD_ATTR: ["class", "style", "xmlns", "encoding", "display"],
    });
  }, [nonTableContent]);

  return (
    <div>
      {tableData && <TableRenderer tableData={tableData} />}
      {nonTableContent && (
        <div
          ref={contentRef}
          className="prose prose-xl prose-sky prose-headings:font-bold prose-p:leading-relaxed prose-a:text-sky-500 prose-img:mx-auto prose-img:max-h-[50vh] prose-img:w-auto prose-img:rounded-lg prose-pre:max-h-[60vh] prose-pre:overflow-y-auto dark:prose-invert dark:prose-headings:text-white dark:prose-p:text-slate-200 dark:prose-strong:text-white dark:prose-code:text-sky-300 dark:prose-li:text-slate-200 max-w-none"
        />
      )}
    </div>
  );
}

export function PresentationBlockRenderer({
  block,
  lessonId = 0,
}: PresentationBlockRendererProps) {
  switch (block.__component) {
    case "droplets.generic":
      return <GenericBlockDisplay block={block} />;

    case "droplets.callout":
      return (
        <div
          className={`my-6 flex items-start gap-4 rounded-lg p-6 text-lg ${block.color}`}
        >
          {block.iconEnabled && <CalloutIcon color={block.color} />}
          <div className="flex-1 text-slate-900">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <BlocksRenderer content={block.content as any} />
          </div>
        </div>
      );

    case "droplets.quiz":
      return (
        <QuizBlock
          data={{ id: block.id ?? 0, questions: block.questions }}
          lessonId={lessonId}
        />
      );

    case "droplets.open-ended-quiz":
      return (
        <OpenEndedQuizBlock
          data={{ id: block.id ?? 0, questions: block.questions }}
          lessonId={lessonId}
        />
      );

    case "droplets.code-block":
      return (
        <div className="max-h-[65vh] overflow-y-auto rounded-lg">
          {(block as any).isNotebook ? (
            <NotebookCodeViewer
              code={block.code}
              language={block.language}
              editable={block.editable}
              testCode={(block as any).testCode}
            />
          ) : (
            <CodeBlockViewer
              language={block.language}
              code={block.code}
              editable={block.editable}
              runnable={block.runnable}
            />
          )}
        </div>
      );

    case "droplets.video":
      return (
        <div className="my-4 aspect-video w-full overflow-hidden rounded-md">
          <iframe
            src={block.url}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );

    case "droplets.expandable":
      return (
        <div className="my-4 rounded-md border border-slate-200 p-4 dark:border-slate-600">
          <p className="font-semibold">{block.title}</p>
          <div
            className="prose prose-sky mt-2 dark:text-slate-200"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(block.content),
            }}
          />
        </div>
      );

    case "droplets.sandpack-block":
      return (
        <SandpackViewer
          template={block.template as "vanilla" | "react" | "react-ts"}
          files={parseSandpackFiles(block.files)}
          showPreview={block.showPreview}
          editable={block.editable}
          presentationMode
        />
      );

    default:
      return null;
  }
}
