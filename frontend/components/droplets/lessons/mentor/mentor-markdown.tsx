"use client";

import {
  createContext,
  lazy,
  Suspense,
  useContext,
  type ReactNode,
} from "react";
import { SOURCE_HREF } from "@/lib/mentor/answer-text";
import type { Citation } from "@/lib/mentor/types";

const Markdown = lazy(() => import("react-markdown"));

const ALLOWED = ["p", "strong", "em", "code", "pre", "ul", "ol", "li"];

type Sources = {
  citations: Citation[];
  onShowSource: (citation: Citation) => void;
};
const SourcesContext = createContext<Sources | null>(null);

/**
 * A linked phrase (ODY-968): a button that shows its passage, like a Sources
 * chip. Any other link is just its words. Defined once, so the button keeps
 * focus when the answer re-renders.
 */
function SourceLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  const sources = useContext(SourcesContext);
  const citation = sources?.citations.find(
    (c) => `${SOURCE_HREF}${c.ref}` === href,
  );
  if (!sources || !citation) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => sources.onShowSource(citation)}
      className="inline text-left text-[#287697] underline underline-offset-2 hover:decoration-2 dark:text-[#6cc0e0]"
    >
      {children}
      <span className="sr-only"> (Show in lesson: {citation.label})</span>
    </button>
  );
}
const COMPONENTS = { a: SourceLink };

/**
 * Mentor's Markdown: a few inline and list elements; links unwrap to text.
 * Given `citations` and `onShowSource`, a link to `${SOURCE_HREF}<ref>` for
 * one of them becomes a button (see `displayAnswer`'s `linkRefs`).
 */
export function MentorMarkdown({
  children,
  fallback = children,
  citations,
  onShowSource,
}: {
  children: string;
  /** Shown while react-markdown loads; pass the text without links */
  fallback?: string;
  citations?: Citation[];
  onShowSource?: (citation: Citation) => void;
}) {
  const sources =
    citations?.length && onShowSource ? { citations, onShowSource } : null;
  return (
    <Suspense fallback={<p>{fallback}</p>}>
      <SourcesContext.Provider value={sources}>
        <Markdown
          allowedElements={sources ? [...ALLOWED, "a"] : ALLOWED}
          unwrapDisallowed
          components={COMPONENTS}
        >
          {children}
        </Markdown>
      </SourcesContext.Provider>
    </Suspense>
  );
}
