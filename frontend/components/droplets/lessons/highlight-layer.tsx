"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { EditorView } from "@codemirror/view";
import { Highlight, HighlightColor } from "@/types";
import {
  HIGHLIGHT_CLASS,
  REGION_ATTR,
  type SavedHighlight,
  byDrawOrder,
  codeEditorReader,
  codeMarks,
  drawHighlights,
  isSaved,
  regionIds,
  regionProps,
  regionReader,
  setRegionReader,
  trimmed,
} from "@/lib/highlight-regions";
import { SelectionToolbar, type ToolbarAnchor } from "./selection-toolbar";

/** A highlight the reader just made, before it's saved */
export type HighlightDraft = Pick<
  Highlight,
  "text" | "position" | "color" | "blockId"
>;

/**
 * Saved highlights a new one overlaps: `baseId` is extended to cover the
 * draft, and the highlights in `removeIds` are deleted.
 */
export interface HighlightMerge {
  baseId: number;
  removeIds: number[];
}

/** One highlight to save, merged into any saved ones it overlaps */
export interface HighlightRequest {
  draft: HighlightDraft;
  merge?: HighlightMerge;
}

interface HighlightLayerProps {
  highlights: Highlight[];
  canHighlight: boolean;
  /**
   * Saves highlights: one per block a selection covers. Resolves to each
   * once saved, or null where that failed.
   */
  onHighlight: (
    requests: HighlightRequest[],
    options?: { withNote?: boolean },
  ) => Promise<(Highlight | null)[]>;
  onRecolorHighlight: (highlightIds: number[], color: HighlightColor) => void;
  onDeleteHighlight: (highlightIds: number[]) => void;
  onNote: (notePos: number, highlight: Highlight) => void;
  className?: string;
  children: React.ReactNode;
}

/** The part of a selection in one region */
interface Segment {
  region: HTMLElement;
  start: number;
  end: number;
  text: string;
}

/** What the toolbar acts on: new text, or saved highlights */
type ToolbarTarget =
  | { kind: "selection"; segments: Segment[] }
  | { kind: "highlight"; highlightIds: number[] };

interface ToolbarState {
  target: ToolbarTarget;
  /** The block it's shown in (see homeOf) */
  home: HTMLElement;
  anchor: ToolbarAnchor;
  /** Where a note made from here goes, in px from the top of the block */
  notePos: number;
}

// How long the selection has to stay still before the toolbar opens
const SELECTION_DELAY_MS = 150;

const HighlightsContext = createContext<Highlight[]>([]);

/**
 * The highlights for a region showing these block ids, and a key that
 * changes only when one of them does
 */
export function useRegionHighlights(ids: number[]) {
  const highlights = useContext(HighlightsContext).filter((h) =>
    ids.includes(h.blockId),
  );
  const key = highlights
    .map((h) => `${h.id}:${h.position?.start}-${h.position?.end}:${h.color}`)
    .join(",");
  return { highlights, key };
}

/** A rect's position relative to `parent`, for placing the toolbar */
function anchorIn(parent: HTMLElement, rect: DOMRect): ToolbarAnchor {
  const parentRect = parent.getBoundingClientRect();
  return {
    top: rect.top - parentRect.top,
    bottom: rect.bottom - parentRect.top,
    centerX: rect.left + rect.width / 2 - parentRect.left,
  };
}

/**
 * The block a region is in: the layer's child holding it. Each block's
 * outermost element is positioned, and the toolbar is shown at its end.
 */
const homeOf = (root: HTMLElement, region: HTMLElement) =>
  Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.contains(region),
  );

/** The part of `range` inside `region` */
function partIn(region: HTMLElement, range: Range): Range {
  const part = new Range();
  part.selectNodeContents(region);
  if (region.contains(range.startContainer)) {
    part.setStart(range.startContainer, range.startOffset);
  }
  if (region.contains(range.endContainer)) {
    part.setEnd(range.endContainer, range.endOffset);
  }
  return part;
}

/** Where a selection falls in each region it covers, in order */
function segmentsOf(root: HTMLElement, range: Range): Segment[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${REGION_ATTR}]`))
    .filter((region) => range.intersectsNode(region))
    .flatMap((region) => {
      const reader = regionReader(region);
      const text = reader.text();
      const start = region.contains(range.startContainer)
        ? reader.offsetOf(range.startContainer, range.startOffset)
        : 0;
      const end = region.contains(range.endContainer)
        ? reader.offsetOf(range.endContainer, range.endOffset)
        : text.length;
      return start < end && /\S/.test(text.slice(start, end))
        ? [{ region, start, end, text: reader.slice(start, end) }]
        : [];
    });
}

/**
 * Highlighting for every block inside it: it reads the reader's selection
 * across blocks, shows the toolbar in the block where the selection ends,
 * and opens it on a click on a saved highlight. Each block draws its own
 * highlights into its region (see lib/highlight-regions).
 */
export function HighlightLayer({
  highlights,
  canHighlight,
  onHighlight,
  onRecolorHighlight,
  onDeleteHighlight,
  onNote,
  className,
  children,
}: HighlightLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("#fff300");
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const highlightsRef = useRef(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  });

  const highlightsIn = (region: HTMLElement): Highlight[] => {
    const ids = regionIds(region);
    return highlightsRef.current.filter((h) => ids.includes(h.blockId));
  };

  // The toolbar follows the selection however it was made: mouse, Shift +
  // arrow keys, or a long-press on a phone
  const readSelection = () => {
    const root = rootRef.current;
    const selection = window.getSelection();
    if (!root) return;

    const range =
      selection && selection.rangeCount > 0 && !selection.isCollapsed
        ? selection.getRangeAt(0)
        : null;
    if (!range) {
      // A toolbar opened by clicking a highlight has no selection to begin
      // with, and one in use from the keyboard has already read its own
      const toolbarFocused = !!root
        .querySelector('[role="toolbar"]')
        ?.contains(document.activeElement);
      setToolbar((current) =>
        current?.target.kind === "selection" && !toolbarFocused
          ? null
          : current,
      );
      return;
    }

    const segments = segmentsOf(root, range);
    const first = segments[0];
    const last = segments[segments.length - 1];
    const home = last && homeOf(root, last.region);
    if (!home) {
      setToolbar(null);
      return;
    }
    // A selection within one block: its text as the reader sees it, with its
    // line breaks
    if (
      first.region.contains(range.startContainer) &&
      first.region.contains(range.endContainer)
    ) {
      let text = selection!.toString();
      const latexParent = range.startContainer.parentElement?.closest(
        ".katex-inline, .katex-block",
      );
      if (latexParent) {
        text = decodeURIComponent(
          latexParent.getAttribute("data-latex") || text,
        );
      }
      first.text = text;
    }

    // Exactly saved highlights' text (as drawn): offer to recolour or remove
    // them. Part of one is new text to highlight on top of it.
    const same = segments.map(({ region, start, end }) => {
      const text = regionReader(region).text();
      const selected = trimmed(text, start, end);
      return highlightsIn(region)
        .filter(isSaved)
        .sort(byDrawOrder)
        .filter((h) => {
          const drawn = trimmed(text, h.position.start, h.position.end);
          return drawn.start === selected.start && drawn.end === selected.end;
        })
        .pop();
    });
    const sameIds = same.flatMap((h) => (h ? [h.id] : []));

    setToolbar({
      target:
        sameIds.length === segments.length
          ? { kind: "highlight", highlightIds: sameIds }
          : { kind: "selection", segments },
      home,
      anchor: anchorIn(
        home,
        partIn(last.region, range).getBoundingClientRect(),
      ),
      notePos:
        partIn(first.region, range).getBoundingClientRect().top -
        first.region.getBoundingClientRect().top,
    });
  };
  const readSelectionRef = useRef(readSelection);
  useEffect(() => {
    readSelectionRef.current = readSelection;
  });

  useEffect(() => {
    if (!canHighlight) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleSelectionChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => readSelectionRef.current(), SELECTION_DELAY_MS);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [canHighlight]);

  const closeToolbar = useCallback(() => setToolbar(null), []);

  const finishToolbar = () => {
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  /**
   * A new highlight over the selected text in one region. Inside saved
   * highlights, it goes on top of them (`inside` is the innermost). Across
   * saved highlights' edges, it's merged with them: the one with a note (or
   * the first) is extended.
   */
  const draftFor = (
    { region, start, end, text }: Segment,
    color: HighlightColor,
  ): HighlightRequest & { inside?: SavedHighlight } => {
    const saved = highlightsIn(region).filter(isSaved);
    const containers = saved
      .filter((h) => h.position.start <= start && end <= h.position.end)
      .sort(byDrawOrder);
    const inside = containers[containers.length - 1];
    const overlapping = saved
      .filter(
        (h) =>
          !containers.includes(h) &&
          h.position.start < end &&
          start < h.position.end,
      )
      .sort(byDrawOrder);
    if (overlapping.length === 0) {
      return {
        draft: {
          text,
          position: { start, end },
          color,
          blockId: regionIds(region)[0],
        },
        inside,
      };
    }

    const mergedStart = Math.min(start, overlapping[0].position.start);
    const mergedEnd = Math.max(end, ...overlapping.map((h) => h.position.end));
    const base = overlapping.find((h) => h.note) ?? overlapping[0];
    return {
      draft: {
        text: regionReader(region).slice(mergedStart, mergedEnd),
        position: { start: mergedStart, end: mergedEnd },
        color,
        blockId: base.blockId,
      },
      merge: {
        baseId: base.id,
        removeIds: overlapping.filter((h) => h !== base).map((h) => h.id),
      },
      inside,
    };
  };

  const handleApplyColor = (color: HighlightColor) => {
    setSelectedColor(color);
    if (!toolbar) return;
    const { target } = toolbar;
    if (target.kind === "highlight") {
      onRecolorHighlight(target.highlightIds, color);
    } else {
      const requests = target.segments
        .map((segment) => draftFor(segment, color))
        // The same colour on top of the highlight around it wouldn't show
        .filter(({ merge, inside }) => merge || inside?.color !== color)
        .map(({ draft, merge }) => ({ draft, merge }));
      if (requests.length > 0) void onHighlight(requests);
    }
    finishToolbar();
  };

  const handleDelete = () => {
    if (toolbar?.target.kind === "highlight") {
      onDeleteHighlight(toolbar.target.highlightIds);
    }
    finishToolbar();
  };

  // The note is linked to the first highlight it's made from, so new ones
  // are saved first and the note waits for them
  const handleNote = async () => {
    if (!toolbar) return;
    const { target, notePos } = toolbar;
    finishToolbar();

    if (target.kind === "highlight") {
      const highlight = highlightsRef.current.find(
        (h) => h.id === target.highlightIds[0],
      );
      if (highlight) onNote(notePos, highlight);
      return;
    }
    const saved = await onHighlight(
      target.segments.map((segment) => {
        const { draft, merge } = draftFor(segment, selectedColor);
        return { draft, merge };
      }),
      { withNote: true },
    );
    const first = saved.find((h): h is Highlight => !!h);
    if (first) onNote(notePos, first);
  };

  const handleClick = (e: React.MouseEvent) => {
    // A drag that ends on a highlight is a selection, handled above
    if (!canHighlight || !window.getSelection()?.isCollapsed) return;

    const piece = (e.target as HTMLElement).closest<HTMLElement>(
      `.${HIGHLIGHT_CLASS}`,
    );
    const region = piece?.closest<HTMLElement>(`[${REGION_ATTR}]`);
    const highlightId = Number(piece?.dataset.highlightId);
    const highlight = highlightsRef.current
      .filter(isSaved)
      .find((h) => h.id === highlightId);
    const home = region && rootRef.current && homeOf(rootRef.current, region);
    if (!piece || !region || !highlight || !home) return;

    const firstPiece = region.querySelector(
      `.${HIGHLIGHT_CLASS}[data-highlight-id="${highlightId}"]`,
    );
    setToolbar({
      target: { kind: "highlight", highlightIds: [highlightId] },
      home,
      anchor: anchorIn(home, piece.getBoundingClientRect()),
      notePos:
        (firstPiece ?? piece).getBoundingClientRect().top -
        region.getBoundingClientRect().top,
    });
  };

  const toolbarTarget = toolbar?.target;
  const toolbarHighlight =
    toolbarTarget?.kind === "highlight"
      ? highlights.find((h) => h.id === toolbarTarget.highlightIds[0])
      : undefined;

  return (
    <HighlightsContext.Provider value={highlights}>
      <div ref={rootRef} onClick={handleClick} className={className}>
        {children}
      </div>
      {/* At the end of the block, right after its text, so Tab reaches it
          next and it scrolls with the text */}
      {canHighlight &&
        toolbar &&
        createPortal(
          <SelectionToolbar
            anchor={toolbar.anchor}
            selectedColor={toolbarHighlight?.color ?? selectedColor}
            isOnHighlight={toolbar.target.kind === "highlight"}
            onApplyColor={handleApplyColor}
            onDelete={handleDelete}
            onNote={handleNote}
            onClose={closeToolbar}
          />,
          toolbar.home,
        )}
    </HighlightsContext.Provider>
  );
}

/**
 * HTML that highlights are drawn in, such as a callout's or an expandable's.
 * React leaves the HTML's DOM alone while `html` is unchanged, so the drawn
 * highlights stay put across renders.
 */
export function HighlightableHtml({
  ids,
  html,
  className,
}: {
  ids: number[];
  html: string;
  className?: string;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const { highlights, key } = useRegionHighlights(ids);
  const highlightsRef = useRef(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  });
  // React 19 sets the HTML again whenever this object is new, which would
  // wipe the drawn highlights, so it's new only when the HTML is
  const innerHtml = useMemo(() => ({ __html: html }), [html]);

  // Redrawn only when the HTML or its highlights change, so a re-render
  // leaves the reader's selection alone
  useEffect(() => {
    if (regionRef.current) {
      drawHighlights(regionRef.current, highlightsRef.current);
    }
  }, [html, key]);

  return (
    <div
      ref={regionRef}
      {...regionProps(ids)}
      className={className}
      dangerouslySetInnerHTML={innerHtml}
    />
  );
}

/**
 * Highlights in a read-only code editor, drawn as its marks. Spread
 * `regionProps` on the element around the editor, and pass `marks` and
 * `onCreateEditor` to the editor.
 */
export function useCodeHighlights(ids: number[], code: string) {
  const regionRef = useRef<HTMLDivElement>(null);
  const { highlights, key } = useRegionHighlights(ids);
  // New marks reconfigure the editor, so they're rebuilt only when `key`
  // says a highlight changed, not for each new highlights array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const marks = useMemo(() => codeMarks(highlights, code), [key, code]);
  const onCreateEditor = useCallback((view: EditorView) => {
    if (regionRef.current) {
      setRegionReader(regionRef.current, codeEditorReader(view));
    }
  }, []);

  return {
    regionRef,
    regionProps: ids.length > 0 ? regionProps(ids) : {},
    marks,
    onCreateEditor,
  };
}
