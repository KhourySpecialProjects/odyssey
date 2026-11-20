import fs from "fs";
import path from "path";
import * as ts from "typescript";

// DialogContent/SheetContent render their own close; see ODY-874/ODY-917.

const SOURCE_DIRS = ["components", "app"];
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "testing",
  "tests",
  "__tests__",
  "e2e",
]);
const EXCLUDED_FILES = new Set([
  path.join("components", "ui", "dialog.tsx"),
  path.join("components", "ui", "sheet.tsx"),
]);
const X_ICONS = new Set(["X", "XIcon", "IconX"]);
const X_TEXT = new Set(["×", "✕", "&times;"]);
const FIX =
  "pass closeClassName to DialogContent instead of adding a manual close";

export type CloseViolation = { line: number; message: string };

function tagName(n: ts.JsxOpeningLikeElement, sf: ts.SourceFile): string {
  return n.tagName.getText(sf);
}

const RENDERS_DIALOG = /DialogContent|SheetContent|ResponsiveDialog/;

// Aliased imports (`X as CloseIcon`, `DialogClose as Close`) and DialogPrimitive.Close aren't tracked.
function findAttr(
  n: ts.JsxOpeningLikeElement,
  name: string,
  sf: ts.SourceFile,
): ts.JsxAttribute | undefined {
  return n.attributes.properties.find(
    (p): p is ts.JsxAttribute =>
      ts.isJsxAttribute(p) && p.name.getText(sf) === name,
  );
}

/** True if the attribute is present and not a literal `false`. */
function hasAttr(
  n: ts.JsxOpeningLikeElement,
  name: string,
  sf: ts.SourceFile,
): boolean {
  const attr = findAttr(n, name, sf);
  if (!attr) return false;
  const init = attr.initializer;
  return !(
    init &&
    ts.isJsxExpression(init) &&
    init.expression?.kind === ts.SyntaxKind.FalseKeyword
  );
}

function attrText(
  n: ts.JsxOpeningLikeElement,
  name: string,
  sf: ts.SourceFile,
): string | undefined {
  const init = findAttr(n, name, sf)?.initializer;
  if (!init) return undefined;
  if (ts.isStringLiteral(init)) return init.text;
  if (
    ts.isJsxExpression(init) &&
    init.expression &&
    ts.isStringLiteralLike(init.expression)
  ) {
    return init.expression.text;
  }
  return undefined;
}

const isBlank = (c: ts.JsxChild, sf: ts.SourceFile) =>
  ts.isJsxText(c) && c.getText(sf).trim() === "";

/** The text of a `<span className="sr-only">` child, else undefined. */
function srOnlyText(c: ts.JsxChild, sf: ts.SourceFile): string | undefined {
  if (!ts.isJsxElement(c) || tagName(c.openingElement, sf) !== "span") {
    return undefined;
  }
  if (!/\bsr-only\b/.test(attrText(c.openingElement, "className", sf) ?? "")) {
    return undefined;
  }
  return c.children
    .map((k) => k.getText(sf))
    .join("")
    .trim();
}

/** True if the only non-whitespace, non-sr-only child is an X icon or glyph. */
function onlyChildIsX(el: ts.JsxElement, sf: ts.SourceFile): boolean {
  const kids = el.children.filter(
    (c) => !isBlank(c, sf) && srOnlyText(c, sf) === undefined,
  );
  if (kids.length !== 1) return false;
  const kid = kids[0];
  if (ts.isJsxText(kid)) return X_TEXT.has(kid.getText(sf).trim());
  if (ts.isJsxSelfClosingElement(kid)) return X_ICONS.has(tagName(kid, sf));
  if (ts.isJsxElement(kid)) return X_ICONS.has(tagName(kid.openingElement, sf));
  return false;
}

/** True if the button's aria-label or sr-only text is exactly "Close". */
function hasCloseLabel(
  opening: ts.JsxOpeningLikeElement,
  el: ts.Node,
  sf: ts.SourceFile,
): boolean {
  const labels = [attrText(opening, "aria-label", sf)];
  if (ts.isJsxElement(el)) {
    labels.push(...el.children.map((c) => srOnlyText(c, sf)));
  }
  return labels.some((l) => l !== undefined && /^close\b/i.test(l.trim()));
}

/** Finds a second close button in a file that renders DialogContent/SheetContent. */
export function scanSource(
  source: string,
  fileName = "file.tsx",
): CloseViolation[] {
  if (!RENDERS_DIALOG.test(source)) return [];
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const results: CloseViolation[] = [];
  const add = (n: ts.Node, message: string) =>
    results.push({
      line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
      message,
    });

  const flagged = new Set<ts.Node>();
  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const opening = ts.isJsxElement(n) ? n.openingElement : n;
      const name = tagName(opening, sf);
      if (
        (name === "DialogClose" || name === "SheetClose") &&
        !hasAttr(opening, "asChild", sf)
      ) {
        add(n, `<${name}> without asChild adds a second X: ${FIX}`);
      }
      if (
        (name === "DialogClose" || name === "SheetClose") &&
        ts.isJsxElement(n)
      ) {
        // An X inside a close wrapper is a second close, whatever its label.
        const kids = n.children.filter((c) => !isBlank(c, sf));
        const child = kids.find(
          (c): c is ts.JsxElement => ts.isJsxElement(c) && onlyChildIsX(c, sf),
        );
        if (child) {
          flagged.add(child);
          add(n, `X inside <${name}> duplicates the built-in close: ${FIX}`);
        } else if (onlyChildIsX(n, sf)) {
          add(n, `X inside <${name}> duplicates the built-in close: ${FIX}`);
        }
      }
      if ((name === "button" || name === "Button") && !flagged.has(n)) {
        if (hasCloseLabel(opening, n, sf)) {
          add(
            n,
            `button labelled "Close" duplicates the built-in close: ${FIX}`,
          );
        } else if (
          ts.isJsxElement(n) &&
          !hasAttr(opening, "aria-label", sf) &&
          !hasAttr(opening, "aria-labelledby", sf) &&
          !n.children.some((c) => srOnlyText(c, sf)) &&
          onlyChildIsX(n, sf)
        ) {
          add(
            n,
            `icon-only X button: if it closes the dialog, ${FIX}; otherwise add an aria-label`,
          );
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return results;
}

function findSourceFiles(root: string): string[] {
  const results: string[] = [];
  for (const top of SOURCE_DIRS) {
    const base = path.join(root, top);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { recursive: true }) as string[]) {
      const rel = path.join(top, entry);
      if (rel.split(path.sep).some((seg) => EXCLUDED_DIRS.has(seg))) continue;
      if (EXCLUDED_FILES.has(rel)) continue;
      if (!/\.tsx$/.test(entry) || /\.(test|spec)\.tsx$/.test(entry)) continue;
      results.push(rel);
    }
  }
  return results.sort();
}

describe("scanSource", () => {
  const wrap = (body: string) => `<DialogContent>${body}</DialogContent>`;

  it.each([
    ["a bare DialogClose", wrap(`<DialogClose className="absolute" />`)],
    [
      "an unlabelled IconX button",
      wrap(`<button onClick={f}><IconX/></button>`),
    ],
    [
      "an unlabelled X text button",
      wrap(`<button onClick={f}>&times;</button>`),
    ],
    ["a capital Button with an X", wrap(`<Button onClick={f}><X/></Button>`)],
    [
      "an X with an sr-only Close span",
      wrap(
        `<Button size="icon"><X/><span className="sr-only">Close</span></Button>`,
      ),
    ],
    [
      "an aria-label Close button",
      wrap(`<button aria-label="Close"><X/></button>`),
    ],
    [
      'an aria-label "Close dialog" button',
      wrap(`<button aria-label="Close dialog"><X/></button>`),
    ],
    [
      'an X with an sr-only "Close dialog" span',
      wrap(
        `<button><X/><span className="sr-only">Close dialog</span></button>`,
      ),
    ],
    [
      "an asChild DialogClose around a labelled Close button",
      wrap(
        `<DialogClose asChild><button aria-label="Close"><X/></button></DialogClose>`,
      ),
    ],
    [
      "DialogClose with asChild={false}",
      wrap(`<DialogClose asChild={false} className="absolute" />`),
    ],
    [
      "an X button in a ResponsiveDialog file",
      `<ResponsiveDialog><button onClick={f}><X/></button></ResponsiveDialog>`,
    ],
    [
      'an X button labelled "Dismiss" inside DialogClose asChild',
      wrap(
        `<DialogClose asChild><button aria-label="Dismiss"><X/></button></DialogClose>`,
      ),
    ],
    [
      "an X button inside SheetClose asChild",
      wrap(
        `<SheetClose asChild><button aria-label="Dismiss"><X/></button></SheetClose>`,
      ),
    ],
  ])("flags %s", (_name, src) => {
    expect(scanSource(src)).toHaveLength(1);
  });

  it.each([
    [
      "an asChild DialogClose",
      wrap(`<DialogClose asChild><Button>Cancel</Button></DialogClose>`),
    ],
    [
      "a labelled X button",
      wrap(`<button aria-label="Remove image"><X/></button>`),
    ],
    [
      'an X button labelled "Closed items" (not a close)',
      wrap(`<button aria-label="Closed items"><X/></button>`),
    ],
    [
      "an X button labelled by aria-labelledby",
      wrap(`<button aria-labelledby="t"><X/></button>`),
    ],
    [
      "an X with a non-close sr-only label",
      wrap(`<button><X/><span className="sr-only">Remove</span></button>`),
    ],
    ["a file without DialogContent", `<DialogClose className="absolute" />`],
  ])("passes %s", (_name, src) => {
    expect(scanSource(src)).toEqual([]);
  });

  it("reports the line of the offending element", () => {
    const src = `<DialogContent>\n  <p>hi</p>\n  <DialogClose />\n</DialogContent>`;
    expect(scanSource(src)).toEqual([
      { line: 3, message: expect.stringContaining("<DialogClose>") },
    ]);
  });
});

describe("one close button per dialog", () => {
  const root = path.resolve(__dirname, "../..");
  const files = findSourceFiles(root);
  const dialogFiles = files.filter((rel) =>
    RENDERS_DIALOG.test(fs.readFileSync(path.join(root, rel), "utf-8")),
  );
  const found = files.flatMap((rel) =>
    scanSource(fs.readFileSync(path.join(root, rel), "utf-8"), rel).map(
      (r) => ({ ...r, file: rel }),
    ),
  );

  it("scans the dialog files (guards against the filter silently matching nothing)", () => {
    expect(dialogFiles.length).toBeGreaterThan(30);
  });

  it("has no manual close next to the built-in one", () => {
    const hits = found.map((f) => `${f.file}:${f.line} ${f.message}`);
    expect(hits).toEqual([]);
  });
});
