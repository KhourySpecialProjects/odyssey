import { parse, HTMLElement, TextNode, type Node } from "node-html-parser";
import type { AnchorBlock } from "./types";

// <pre> is left out so it's parsed; <style> stays as text, as DOMPurify keeps it
const PARSE_OPTIONS = {
  comment: false,
  blockTextElements: { script: false, noscript: false, style: true },
};

// DOMPurify drops script, noscript and iframe; a template's content isn't in the DOM tree
const SKIP = new Set(["script", "template", "noscript", "iframe"]);

function walk(nodes: Node[], out: string[], dropLeadingNewline = false) {
  nodes.forEach((node, i) => {
    if (node instanceof TextNode) {
      const text = node.text;
      out.push(dropLeadingNewline && i === 0 ? text.replace(/^\n/, "") : text);
    } else if (node instanceof HTMLElement) {
      const tag = node.rawTagName?.toLowerCase() ?? "";
      if (SKIP.has(tag)) return;
      if (tag === "br") {
        if (!node.classList.contains("ProseMirror-trailingBreak")) {
          out.push("\n");
        }
        return;
      }
      // A browser drops one newline right after <pre>
      walk(node.childNodes, out, tag === "pre");
    }
  });
}

/**
 * `htmlContent` without a browser DOM, for the server-side run. Not in the
 * anchors index, so `node-html-parser` stays out of client bundles.
 */
export function htmlTextContent(html: string): AnchorBlock[] {
  const out: string[] = [];
  // A browser turns CRLF and lone CR into LF before parsing
  walk(parse(html.replace(/\r\n?/g, "\n"), PARSE_OPTIONS).childNodes, out);
  return [{ text: out.join("") }];
}
