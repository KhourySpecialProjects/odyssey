import { renderToStaticMarkup } from "react-dom/server";
import {
  BlocksRenderer,
  type BlocksContent,
} from "@strapi/blocks-react-renderer";
import { blocksToHtml } from "@/lib/strapi-blocks-html";

const content = [
  {
    type: "paragraph",
    children: [
      { type: "text", text: "Use " },
      { type: "text", text: "inner", bold: true, italic: true },
      { type: "text", text: " joins", code: true, underline: true },
      { type: "text", text: "\nnext <line> & more", strikethrough: true },
      {
        type: "link",
        url: "https://x.test/?a=1&b=2",
        children: [{ type: "text", text: "docs", bold: true }],
      },
    ],
  },
  { type: "paragraph", children: [{ type: "text", text: "" }] },
  { type: "heading", level: 3, children: [{ type: "text", text: "Heading" }] },
  { type: "quote", children: [{ type: "text", text: "A quote" }] },
  {
    type: "code",
    children: [
      { type: "text", text: "if (a < b) {\n  go();\n}" },
      {
        type: "link",
        url: "https://x.test",
        children: [{ type: "text", text: " // see" }],
      },
    ],
  },
  {
    type: "list",
    format: "ordered",
    children: [
      { type: "list-item", children: [{ type: "text", text: "One" }] },
      {
        type: "list",
        format: "unordered",
        children: [
          { type: "list-item", children: [{ type: "text", text: "Nested" }] },
        ],
      },
    ],
  },
  {
    type: "image",
    image: { url: "/chart.png", alternativeText: 'A "chart"' },
    children: [{ type: "text", text: "" }],
  },
] as unknown as BlocksContent;

/** HTML as the browser serialises it, so `<br>` and `<br/>` compare equal */
function normalised(html: string) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.innerHTML;
}

describe("blocksToHtml", () => {
  it("gives the same markup as BlocksRenderer", () => {
    expect(normalised(blocksToHtml(content))).toBe(
      normalised(renderToStaticMarkup(<BlocksRenderer content={content} />)),
    );
  });

  it("escapes text and attributes", () => {
    const element = document.createElement("div");
    element.innerHTML = blocksToHtml(
      content.slice(0, 1).concat({
        type: "paragraph",
        children: [{ type: "text", text: "<img src=x onerror=alert(1)>" }],
      } as unknown as BlocksContent[number]),
    );

    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector("a")).toHaveAttribute(
      "href",
      "https://x.test/?a=1&b=2",
    );
    expect(element).toHaveTextContent("<img src=x onerror=alert(1)>");
  });

  it("skips blocks it doesn't know, and renders nothing for no content", () => {
    expect(
      blocksToHtml([
        { type: "mystery", children: [] },
      ] as unknown as BlocksContent),
    ).toBe("");
    expect(blocksToHtml(null)).toBe("");
  });
});
