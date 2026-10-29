import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { AnchorRange } from "./types";
import { badgeElement, caretElement } from "./dom";

/**
 * An anchor to draw, with an optional class for its span (ODY-806). `point`
 * also draws a caret at that end of the range: a comment at one spot.
 */
export type DrawnAnchor = {
  id: string;
  range: AnchorRange;
  className?: string;
  point?: "before" | "after";
  /** A finding's number, drawn as one empty marker at the start of the range */
  badge?: number;
};

const anchorsKey = new PluginKey("anchors");

/**
 * Decorations that draw anchors in the BlockNote editor as spans tagged
 * data-anchor-id. The editor's DOM can't be wrapped by hand like the lesson
 * view's: ProseMirror would read that as an edit.
 *
 * An anchor's offsets are positions in its block's text: the lesson schema's
 * inline content is text and links (marks), and a line break is one position
 * and one "\n". An anchor across blocks marks the rest of its first block,
 * every block in between, and the start of its last.
 */
export function anchorDecorations(
  doc: ProseMirrorNode,
  anchors: DrawnAnchor[],
): DecorationSet {
  const decorations: Decoration[] = [];
  // Anchors across blocks whose first block has been passed
  const open = new Set<DrawnAnchor>();
  doc.descendants((node, pos) => {
    if (node.type.name !== "blockContainer") return true;
    const content = node.firstChild;
    if (!content?.isTextblock) {
      // An anchor across blocks can end on one without text (an image)
      for (const anchor of open) {
        if (anchor.range.endBlockId === node.attrs.id) open.delete(anchor);
      }
      return true;
    }

    // Inside the container, then inside its content node
    const textStart = pos + 2;
    const size = content.content.size;
    for (const anchor of anchors) {
      const { id, range, className, point, badge } = anchor;
      let from: number;
      let to: number;
      if (range.blockId === node.attrs.id) {
        from = range.start;
        to = range.endBlockId === undefined ? range.end : size;
        if (range.endBlockId !== undefined) open.add(anchor);
      } else if (open.has(anchor)) {
        from = 0;
        to = range.endBlockId === node.attrs.id ? range.end : size;
        if (range.endBlockId === node.attrs.id) open.delete(anchor);
      } else {
        continue;
      }
      const end = Math.min(to, size);
      if (from < end) {
        decorations.push(
          // nodeName gives each anchor its own span: without it ProseMirror
          // merges overlapping decorations into one, and one id wins
          Decoration.inline(textStart + from, textStart + end, {
            nodeName: "span",
            "data-anchor-id": id,
            ...(className && { class: className }),
          }),
        );
      }
      // Only on the anchor's first block
      if (badge !== undefined && range.blockId === node.attrs.id) {
        decorations.push(
          Decoration.widget(
            textStart + from,
            () => badgeElement(id, badge, className),
            {
              side: -1,
              key: `${id} badge ${badge} ${className ?? ""}`,
              ignoreSelection: true,
            },
          ),
        );
      }
      if (point) {
        decorations.push(
          Decoration.widget(
            textStart + (point === "before" ? from : end),
            () => caretElement(id, className),
            {
              side: point === "before" ? -1 : 1,
              key: `${id} ${className ?? ""}`,
              ignoreSelection: true,
            },
          ),
        );
      }
    }
    return true;
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * A ProseMirror plugin that draws whatever anchors `getAnchors` returns.
 * Registered as a BlockNote extension; call refreshAnchors after they change.
 */
export function anchorsPlugin(getAnchors: () => DrawnAnchor[]): Plugin {
  return new Plugin({
    key: anchorsKey,
    props: {
      decorations: (state) => anchorDecorations(state.doc, getAnchors()),
    },
  });
}

/** Redraws the anchors after they change */
export function refreshAnchors(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(anchorsKey, true));
}
