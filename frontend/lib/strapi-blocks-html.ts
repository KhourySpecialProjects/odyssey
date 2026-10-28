import type { BlocksContent } from "@strapi/blocks-react-renderer";

type BlockNode = BlocksContent[number];
type ListNode = Extract<BlockNode, { type: "list" }>;
type InlineNode = Extract<BlockNode, { type: "paragraph" }>["children"][number];
type TextNode = Extract<InlineNode, { type: "text" }>;

const MODIFIER_TAGS: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strikethrough: "del",
  code: "code",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Modifiers wrap the text in the order they're listed, as BlocksRenderer does
function textHtml({ text, ...modifiers }: Omit<TextNode, "type">): string {
  return Object.entries(modifiers).reduce(
    (html, [modifier, on]) => {
      const tag = MODIFIER_TAGS[modifier];
      return on && tag ? `<${tag}>${html}</${tag}>` : html;
    },
    escapeHtml(text).replace(/\r?\n|\r/g, "<br>"),
  );
}

function inlineHtml(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "link") {
        return `<a href="${escapeHtml(node.url)}">${inlineHtml(node.children)}</a>`;
      }
      const { type: _type, ...text } = node;
      return textHtml(text);
    })
    .join("");
}

const plainText = (nodes: InlineNode[]): string =>
  nodes
    .map((node) =>
      node.type === "link" ? plainText(node.children) : node.text,
    )
    .join("");

function blockHtml(node: BlockNode | ListNode["children"][number]): string {
  switch (node.type) {
    case "paragraph": {
      // An empty paragraph is a blank line
      const [only] = node.children;
      if (node.children.length === 1 && only.type === "text" && !only.text) {
        return "<br>";
      }
      return `<p>${inlineHtml(node.children)}</p>`;
    }
    case "heading":
      return `<h${node.level}>${inlineHtml(node.children)}</h${node.level}>`;
    case "quote":
      return `<blockquote>${inlineHtml(node.children)}</blockquote>`;
    case "code":
      return `<pre><code>${escapeHtml(plainText(node.children))}</code></pre>`;
    case "list": {
      const tag = node.format === "ordered" ? "ol" : "ul";
      return `<${tag}>${node.children.map(blockHtml).join("")}</${tag}>`;
    }
    case "list-item":
      return `<li>${inlineHtml(node.children)}</li>`;
    case "image": {
      const alt = node.image.alternativeText;
      return `<img src="${escapeHtml(node.image.url)}"${alt ? ` alt="${escapeHtml(alt)}"` : ""}>`;
    }
    default:
      return "";
  }
}

/**
 * Strapi rich text (a Blocks field) as the HTML BlocksRenderer would render,
 * for content whose DOM is changed after it renders (to draw highlights).
 * Not sanitised: pass the result through DOMPurify before using it.
 */
export function blocksToHtml(content: BlocksContent | null | undefined) {
  return (content ?? []).map(blockHtml).join("");
}
