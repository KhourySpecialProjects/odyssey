import { emblemToDataUrl, EMBLEM_MAX_BYTES } from "@/lib/badges/emblem";
import { SAMPLE_BADGE_EMBLEMS } from "@/testing/mocks/badges";

const DATA_PREFIX = "data:image/svg+xml;charset=utf-8,";
const SVG_NS = "http://www.w3.org/2000/svg";

/** Decode the data URL and parse it as XML, the way an <img> would. */
const decode = (src: string | null) => {
  expect(src?.startsWith(DATA_PREFIX)).toBe(true);
  const text = decodeURIComponent(src!.slice(DATA_PREFIX.length));
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  expect(doc.documentElement.namespaceURI).toBe(SVG_NS);
  return text;
};

const svgWith = (inner: string, rootAttrs = "") =>
  `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 250 100"${rootAttrs}>${inner}<rect width="4" height="4"/></svg>`;

describe("emblemToDataUrl", () => {
  it.each(SAMPLE_BADGE_EMBLEMS.map((s, i) => [i, s]))(
    "keeps sample emblem %s as well-formed svg",
    (_i, svg) => {
      expect(decode(emblemToDataUrl(svg))).toContain("<svg");
    },
  );

  it.each([
    ["script", svgWith("<script>alert(1)</script>"), /<script|alert/],
    ["onload", svgWith("", ' onload="alert(1)"'), /onload|alert/],
    [
      "foreignObject",
      svgWith("<foreignObject><div>hi</div></foreignObject>"),
      /foreignObject|<div/i,
    ],
    [
      "outside href",
      svgWith(
        '<use href="https://evil.test/a.svg#x"/><image href="https://evil.test/i.png"/>',
      ),
      /evil\.test|<use|<image/,
    ],
    [
      "xlink:href",
      svgWith('<use xlink:href="https://evil.test/a.svg#x"/>'),
      /evil\.test|xlink:href/,
    ],
    [
      "javascript: url",
      svgWith('<a href="javascript:alert(1)"><circle r="2"/></a>'),
      /javascript:/i,
    ],
    [
      "style tag",
      svgWith("<style>@import url(https://evil.test/x.css);</style>"),
      /evil\.test|@import|<style/,
    ],
    ["style attribute", svgWith('<g style="fill:red"/>'), /style=/],
    ["filter attribute", svgWith('<g filter="url(#f)"/>'), /filter/],
  ])("strips %s but keeps the shapes", (_name, svg, banned) => {
    const out = decode(emblemToDataUrl(svg));
    expect(out).toContain("<rect");
    expect(out).not.toMatch(banned);
  });

  it("adds the svg namespace when the root has none", () => {
    const out = decode(
      emblemToDataUrl(
        '<svg viewBox="0 0 250 100"><rect width="4" height="4"/></svg>',
      ),
    );
    expect(out).toContain(`xmlns="${SVG_NS}"`);
  });

  it("leaves a fill url() to an outside file in place: an <img> never loads it", () => {
    const out = decode(
      emblemToDataUrl(
        svgWith('<circle r="2" fill="url(https://evil.test/p)"/>'),
      ),
    );
    expect(out).toContain("<rect");
  });

  it.each([
    ["no emblem", undefined],
    ["an empty emblem", "  "],
    ["a script only", "<script>alert(1)</script>"],
    ["html, not svg", "<div>hi</div>"],
    [
      "a code fence around svg",
      "Here is your emblem:\n```svg\n" + svgWith("") + "\n```",
    ],
    ["a doctype before the svg", "<!DOCTYPE svg>&nbsp;" + svgWith("")],
    [
      "input over 12 KB",
      svgWith(`<desc>${"x".repeat(EMBLEM_MAX_BYTES)}</desc>`),
    ],
  ])("returns null for %s", (_label, svg) => {
    expect(emblemToDataUrl(svg)).toBeNull();
  });

  it("never throws on a lone surrogate", () => {
    const src = emblemToDataUrl(svgWith("<text>\uD800</text>"));
    if (src) decode(src);
    else expect(src).toBeNull();
  });
});
