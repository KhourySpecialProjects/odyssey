import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { AnchorRange } from "./types";

export type DrawnAnchor = { id: string; range: AnchorRange };

const anchorsKey = new PluginKey("anchors");

/**
 * Decorations that draw anchors in the BlockNote editor as spans tagged
 * data-anchor-id. The editor's DOM can't be wrapped by hand like the lesson
 * view's: ProseMirror would read that as an edit.
 *
 * An anchor's offsets are positions in its block's text: the lesson schema's
 * inline content is text and links (marks), and a line break is one position
 * and one "\n".
 */
export function anchorDecorations(
  doc: ProseMirrorNode,
  anchors: DrawnAnchor[],
): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "blockContainer") return true;
    const content = node.firstChild;
    if (!content?.isTextblock) return true;

    // Inside the container, then inside its content node
    const textStart = pos + 2;
    for (const { id, range } of anchors) {
      if (range.blockId !== node.attrs.id) continue;
      const end = Math.min(range.end, content.content.size);
      if (range.start < end) {
        decorations.push(
          Decoration.inline(textStart + range.start, textStart + end, {
            "data-anchor-id": id,
          }),
        );
      }
    }
    return true;
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * A ProseMirror plugin that draws whatever anchors `getAnchors` returns.
 * Register it with `editor._tiptapEditor.registerPlugin`, and call
 * refreshAnchors after the anchors change.
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
