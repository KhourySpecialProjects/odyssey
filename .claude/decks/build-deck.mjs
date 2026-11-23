#!/usr/bin/env node
// Builds an Odyssey slide deck (.pptx) from an outline JSON.
// Usage: node build-deck.mjs <outline.json> <out.pptx>
// Layouts and fields are documented in layouts.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const theme = JSON.parse(
  fs.readFileSync(path.join(here, "theme.json"), "utf8"),
);
const { colors: C, fonts: F, sizes: S, grid: G, chrome: CH } = theme;
const W = theme.slide.width;
const H = theme.slide.height;
const LABELS = ["Figma design", "Built"];

// ---------------------------------------------------------------- outline spec

const spec = {
  title: { req: ["title"] },
  agenda: { req: ["items"], arrays: { items: [1, 8] } },
  section: { req: ["title"] },
  timeline: {
    req: ["title", "steps"],
    arrays: { steps: [2, 5] },
    item: { steps: ["date", "label"] },
  },
  pillars: {
    req: ["title", "pillars"],
    arrays: { pillars: [2, 3] },
    item: { pillars: ["name"] },
  },
  "feature-what": { req: ["title", "what"] },
  "feature-steps": {
    req: ["title", "steps"],
    arrays: { steps: [2, 4] },
    item: { steps: ["line"] },
    labelOnItems: "steps",
  },
  screenshot: { req: ["title"], needsLabel: true },
  "design-questions": { req: ["questions"], arrays: { questions: [1, 4] } },
  bullets: { req: ["title", "bullets"], arrays: { bullets: [1, 10] } },
  recap: {
    req: ["items"],
    arrays: { items: [2, 4] },
    item: { items: ["heading"] },
  },
  questions: { req: [] },
  "thank-you": { req: [] },
  appendix: { req: ["title"] },
};

function validate(outline) {
  const errors = [];
  if (
    !outline ||
    typeof outline !== "object" ||
    !Array.isArray(outline.slides) ||
    outline.slides.length === 0
  ) {
    return ['The outline must be an object with a non-empty "slides" array.'];
  }
  outline.slides.forEach((s, i) => {
    const where = `slide ${i + 1}`;
    if (!s || typeof s !== "object") {
      errors.push(`${where}: must be an object.`);
      return;
    }
    const def = spec[s.layout];
    if (!def) {
      errors.push(
        `${where}: unknown layout "${s.layout}". Known layouts: ${Object.keys(spec).join(", ")}.`,
      );
      return;
    }
    for (const f of def.req) {
      const v = s[f];
      if (v === undefined || v === null || v === "")
        errors.push(`${where} (${s.layout}): missing required field "${f}".`);
    }
    for (const [f, [min, max]] of Object.entries(def.arrays || {})) {
      if (s[f] === undefined) continue;
      if (!Array.isArray(s[f]))
        errors.push(`${where} (${s.layout}): "${f}" must be an array.`);
      else if (s[f].length < min || s[f].length > max) {
        errors.push(
          `${where} (${s.layout}): "${f}" needs ${min} to ${max} entries, found ${s[f].length}.`,
        );
      }
    }
    for (const [f, keys] of Object.entries(def.item || {})) {
      (Array.isArray(s[f]) ? s[f] : []).forEach((it, j) => {
        for (const k of keys) {
          if (!it || it[k] === undefined || it[k] === "")
            errors.push(
              `${where} (${s.layout}): ${f}[${j}] is missing "${k}".`,
            );
        }
      });
    }
    const checkLabel = (label, ctx) => {
      if (label === undefined || label === "")
        errors.push(
          `${where} (${s.layout}): ${ctx} needs a "label" of "Figma design" or "Built".`,
        );
      else if (!LABELS.includes(label))
        errors.push(
          `${where} (${s.layout}): ${ctx} label "${label}" must be "Figma design" or "Built".`,
        );
    };
    if (def.needsLabel) checkLabel(s.label, "the screenshot");
    if (def.labelOnItems) {
      (Array.isArray(s[def.labelOnItems]) ? s[def.labelOnItems] : []).forEach(
        (it, j) => {
          checkLabel(
            it && it.label !== undefined ? it.label : s.label,
            `${def.labelOnItems}[${j}]`,
          );
        },
      );
    }
    if (
      s.layout === "feature-what" &&
      s.image !== undefined &&
      s.imageLabel === undefined
    )
      checkLabel(undefined, "the image (use imageLabel)");
    if (
      s.layout === "appendix" &&
      (s.image || s.imageAlt) &&
      s.label === undefined
    )
      checkLabel(undefined, "the appendix image");
    if (s.layout === "design-questions") {
      (Array.isArray(s.questions) ? s.questions : []).forEach((q, j) => {
        if (typeof q === "string") return;
        if (!q || !q.text)
          errors.push(
            `${where} (design-questions): questions[${j}] needs "text".`,
          );
        else if (q.image !== undefined || q.imageAlt !== undefined)
          checkLabel(q.label, `questions[${j}] image`);
      });
    }
  });
  return errors;
}

// -------------------------------------------------------------------- helpers

const ARGS = process.argv.slice(2);
if (ARGS.length !== 2) {
  console.error("Usage: node build-deck.mjs <outline.json> <out.pptx>");
  process.exit(1);
}
const [outlinePath, outPath] = ARGS;
let outline;
try {
  outline = JSON.parse(fs.readFileSync(outlinePath, "utf8"));
} catch (e) {
  console.error(`Could not read the outline "${outlinePath}": ${e.message}`);
  process.exit(1);
}
const problems = validate(outline);
if (problems.length) {
  console.error(
    `The outline has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`,
  );
  process.exit(1);
}
const baseDir = path.dirname(path.resolve(outlinePath));

function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47)
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length) {
      if (b[o] !== 0xff) break;
      const m = b[o + 1];
      const len = b.readUInt16BE(o + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
        return { h: b.readUInt16BE(o + 5), w: b.readUInt16BE(o + 7) };
      o += 2 + len;
    }
  }
  return null;
}

const missing = [];
function resolveImage(p) {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(baseDir, p);
  if (!fs.existsSync(abs)) {
    missing.push(p);
    return null;
  }
  return abs;
}

const pres = new pptxgen();
pres.defineLayout({ name: "ODYSSEY_169", width: W, height: H });
pres.layout = "ODYSSEY_169";
pres.title = outline.title || "Odyssey deck";
pres.company = "Odyssey";

pres.defineSlideMaster({
  title: "ODYSSEY",
  background: { color: C.white },
  objects: [
    {
      line: {
        x: CH.bracketX,
        y: CH.bracketY,
        w: CH.bracketLen,
        h: 0,
        line: { color: C.teal, width: 1 },
      },
    },
    {
      line: {
        x: CH.bracketX,
        y: CH.bracketY,
        w: 0,
        h: CH.bracketDrop,
        line: { color: C.teal, width: 1 },
      },
    },
    {
      line: {
        x: CH.bottomLineX,
        y: CH.bottomLineY,
        w: CH.bottomLineEnd - CH.bottomLineX,
        h: 0,
        line: { color: C.teal, width: 1 },
      },
    },
    {
      image: {
        x: CH.logo.x,
        y: CH.logo.y,
        w: CH.logo.w,
        h: (CH.logo.w * 304) / 980,
        path: path.join(here, "assets", "logo.png"),
      },
    },
  ],
  slideNumber: {
    x: CH.slideNumber.x,
    y: CH.slideNumber.y,
    w: CH.slideNumber.w,
    h: CH.slideNumber.h,
    fontFace: F.body,
    fontSize: S.slideNumber,
    color: C.muted,
    align: "right",
  },
});

const R = pres.ShapeType;

function text(slide, t, o) {
  slide.addText(t, {
    fontFace: F.body,
    color: C.ink,
    fontSize: S.body,
    margin: 0,
    valign: "top",
    ...o,
  });
}

// Shrink long text a little so it stays inside its box.
function fitSize(str, base, perLine, lines) {
  const n = String(str).length;
  const cap = perLine * lines;
  if (n <= cap) return base;
  return Math.max(
    Math.round(base * Math.sqrt(cap / n)),
    Math.round(base * 0.6),
  );
}

function titleBlock(slide, s) {
  const t = s.title;
  text(slide, t, {
    x: G.marginX,
    y: G.titleY,
    w: W - 2 * G.marginX - (s.tag ? 3 : 0),
    h: G.titleH,
    fontFace: F.heading,
    bold: true,
    color: C.navy,
    fontSize: fitSize(t, S.title, 42, 1),
    valign: "middle",
  });
  if (s.subtitle)
    text(slide, s.subtitle, {
      x: G.marginX,
      y: G.titleY + G.titleH,
      w: W - 2 * G.marginX,
      h: 0.4,
      fontSize: S.small + 2,
      color: C.teal,
    });
  if (s.tag) pillarTag(slide, s.tag);
}

// "PILLAR 1   01 02 03" marker, current number highlighted
function pillarTag(slide, tag) {
  const count = tag.count || 3;
  const runs = [
    {
      text: String(tag.pillar || "").toUpperCase() + "   ",
      options: { bold: true, color: C.teal },
    },
  ];
  for (let i = 1; i <= count; i++) {
    runs.push({
      text: String(i).padStart(2, "0") + (i < count ? "  " : ""),
      options: {
        bold: i === tag.index,
        color: i === tag.index ? C.navy : "B8C2CC",
      },
    });
  }
  text(slide, runs, {
    x: W - G.marginX - 3.4,
    y: 0.5,
    w: 3.4,
    h: 0.4,
    fontFace: F.accent,
    fontSize: S.small,
    align: "right",
    valign: "middle",
  });
}

function placeholder(slide, box, alt) {
  slide.addShape(R.rect, {
    ...box,
    fill: { color: C.placeholder },
    line: { color: "B8C2CC", width: 1, dashType: "dash" },
  });
  text(slide, `Image needed:\n${alt || "screenshot"}`, {
    x: box.x + 0.15,
    y: box.y + 0.1,
    w: box.w - 0.3,
    h: box.h - 0.2,
    align: "center",
    valign: "middle",
    color: C.muted,
    fontSize: S.small,
    italic: true,
  });
}

function label(slide, box, lab) {
  if (!lab) return;
  const w = lab === "Built" ? 0.7 : 1.15;
  slide.addShape(R.roundRect, {
    x: box.x + 0.08,
    y: box.y + box.h - 0.34,
    w,
    h: 0.26,
    rectRadius: 0.06,
    fill: { color: lab === "Built" ? C.navy : C.teal },
    line: { color: C.white, width: 0.75 },
  });
  text(slide, lab, {
    x: box.x + 0.08,
    y: box.y + box.h - 0.34,
    w,
    h: 0.26,
    align: "center",
    valign: "middle",
    fontSize: S.label,
    bold: true,
    color: C.white,
  });
}

// Places an image fitted (contain) inside box, or a placeholder. Returns the used box.
function picture(slide, box, file, alt, lab) {
  const abs = resolveImage(file);
  let used = box;
  if (abs) {
    const size = imageSize(abs);
    if (size) {
      const k = Math.min(box.w / size.w, box.h / size.h);
      const w = size.w * k;
      const h = size.h * k;
      used = { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
    }
    slide.addImage({ path: abs, ...used });
    slide.addShape(R.rect, {
      ...used,
      fill: { type: "none" },
      line: { color: C.line, width: 0.75 },
    });
  } else {
    placeholder(slide, box, alt || (file ? `file not found: ${file}` : ""));
  }
  label(slide, used, lab);
  return used;
}

function bulletRuns(items, size) {
  const runs = [];
  items.forEach((it) => {
    const t = typeof it === "string" ? it : it.text;
    runs.push({
      text: t,
      options: { bullet: { indent: 20 }, breakLine: true, fontSize: size },
    });
    if (typeof it === "object" && Array.isArray(it.sub)) {
      it.sub.forEach((sub) =>
        runs.push({
          text: sub,
          options: {
            bullet: { indent: 20 },
            indentLevel: 1,
            breakLine: true,
            fontSize: size - 2,
            color: C.muted,
          },
        }),
      );
    }
  });
  return runs;
}

function notes(slide, s) {
  if (s.notes) slide.addNotes(String(s.notes));
}

// -------------------------------------------------------------------- layouts

const layouts = {
  title(slide, s) {
    slide.addImage({
      path: path.join(here, "assets", "sail.png"),
      x: 7.4,
      y: 1.3,
      w: (4.9 * 1050) / 1130,
      h: 4.9,
    });
    text(slide, s.title, {
      x: 0.9,
      y: 2.3,
      w: 7,
      h: 1.2,
      fontFace: F.heading,
      bold: true,
      color: C.navy,
      fontSize: fitSize(s.title, S.bigTitle, 18, 1),
      valign: "bottom",
    });
    if (s.subtitle)
      text(slide, s.subtitle, {
        x: 0.95,
        y: 3.6,
        w: 6.6,
        h: 0.5,
        fontSize: S.subtitle,
        color: C.teal,
      });
    slide.addShape(R.line, {
      x: 0.95,
      y: 4.25,
      w: 5.5,
      h: 0,
      line: { color: C.line, width: 1 },
    });
    const people = (s.presenters || []).filter(Boolean);
    const lines = [];
    if (people.length) lines.push(people.join("   |   "));
    if (s.date) lines.push(s.date);
    if (lines.length)
      text(slide, lines.join("\n"), {
        x: 0.95,
        y: 4.45,
        w: 6.6,
        h: 0.9,
        fontSize: S.small + 2,
        color: C.muted,
        lineSpacingMultiple: 1.2,
      });
  },

  agenda(slide, s) {
    text(slide, s.title || "Agenda", {
      x: 1.0,
      y: 2.6,
      w: 4.4,
      h: 1.3,
      fontFace: F.heading,
      bold: true,
      color: C.navy,
      fontSize: 48,
      valign: "middle",
      align: "center",
    });
    const items = s.items;
    const rows = items
      .map((it, i) => [
        { text: `${i + 1}.  `, options: { color: C.muted } },
        {
          text: typeof it === "string" ? it : it.text,
          options: { color: C.teal, breakLine: i < items.length - 1 },
        },
      ])
      .flat();
    text(slide, rows, {
      x: 6.1,
      y: 2.3,
      w: 6.5,
      h: 0.5 * items.length + 0.4,
      fontSize: S.subtitle,
      lineSpacingMultiple: 1.25,
      valign: "top",
    });
    slide.addShape(R.line, {
      x: 6.1,
      y: 2.5 + 0.5 * items.length + 0.4,
      w: 6.1,
      h: 0,
      line: { color: C.line, width: 1 },
    });
  },

  section(slide, s) {
    if (s.number)
      text(slide, String(s.number), {
        x: 0,
        y: 2.0,
        w: W,
        h: 0.7,
        align: "center",
        fontFace: F.accent,
        fontSize: 32,
        color: C.teal,
        bold: true,
      });
    text(slide, s.title, {
      x: 1,
      y: 2.7,
      w: W - 2,
      h: 1.3,
      align: "center",
      fontFace: F.heading,
      bold: true,
      color: C.navy,
      fontSize: fitSize(s.title, 48, 30, 1),
      valign: "middle",
    });
    if (s.subtitle)
      text(slide, s.subtitle, {
        x: 1,
        y: 4.1,
        w: W - 2,
        h: 0.6,
        align: "center",
        fontSize: S.subtitle,
        color: C.ink,
      });
  },

  timeline(slide, s) {
    titleBlock(slide, { ...s, title: s.title });
    const n = s.steps.length;
    const colW = 2.8;
    const x0 = G.marginX + colW / 2;
    const x1 = W - G.marginX - colW / 2;
    const y = 4.0;
    // bar: lighter blue then darker blue for the last segment
    slide.addShape(R.rect, {
      x: 0.7,
      y: y - 0.1,
      w: W - 1.4,
      h: 0.2,
      fill: { color: C.blue },
      line: { color: C.blue, width: 0 },
    });
    slide.addShape(R.rect, {
      x: x1 + (x1 - x0) / (n - 1) / 2,
      y: y - 0.1,
      w: W - 0.7 - (x1 + (x1 - x0) / (n - 1) / 2),
      h: 0.2,
      fill: { color: C.blueDark },
      line: { color: C.blueDark, width: 0 },
    });
    s.steps.forEach((st, i) => {
      const cx = n === 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1);
      const above = i % 2 === 0;
      slide.addShape(R.ellipse, {
        x: cx - 0.11,
        y: y - 0.11,
        w: 0.22,
        h: 0.22,
        fill: { color: C.navy },
        line: { color: C.white, width: 1.5 },
      });
      const dateBox = above ? { y: y + 0.2 } : { y: y - 0.62 };
      text(slide, st.date, {
        x: cx - 1.2,
        y: dateBox.y,
        w: 2.4,
        h: 0.4,
        align: "center",
        bold: true,
        fontSize: S.body,
        color: C.navy,
        valign: above ? "top" : "bottom",
      });
      const head = [
        {
          text: st.label,
          options: {
            bold: true,
            color: C.ink,
            fontSize: S.small,
            breakLine: !!(st.items && st.items.length),
          },
        },
      ];
      const list = (st.items || []).map((it, k) => ({
        text: `${k + 1}. ${it}`,
        options: {
          fontSize: S.caption,
          color: C.ink,
          breakLine: k < st.items.length - 1,
        },
      }));
      const h = 1.9;
      text(slide, [...head, ...list], {
        x: cx - colW / 2,
        y: above ? y - 0.35 - h : y + 0.7,
        w: colW,
        h,
        align: "left",
        valign: above ? "bottom" : "top",
        lineSpacingMultiple: 1.1,
      });
    });
  },

  pillars(slide, s) {
    titleBlock(slide, s);
    const n = s.pillars.length;
    const colW = (W - 2 * G.marginX) / n;
    s.pillars.forEach((p, i) => {
      const cx = G.marginX + colW * i + colW / 2;
      if (p.label)
        text(slide, String(p.label).toUpperCase(), {
          x: cx - colW / 2,
          y: 1.95,
          w: colW,
          h: 0.3,
          align: "center",
          fontFace: F.accent,
          bold: true,
          fontSize: S.small,
          color: C.teal,
        });
      text(slide, p.name, {
        x: cx - colW / 2,
        y: 2.3,
        w: colW,
        h: 0.45,
        align: "center",
        bold: true,
        fontSize: 22,
        color: C.navy,
      });
      // column drawn from rectangles: cap, shaft with grooves, base
      slide.addShape(R.roundRect, {
        x: cx - 0.85,
        y: 2.95,
        w: 1.7,
        h: 0.28,
        rectRadius: 0.08,
        fill: { color: C.teal },
        line: { color: C.teal, width: 0 },
      });
      slide.addShape(R.rect, {
        x: cx - 0.6,
        y: 3.23,
        w: 1.2,
        h: 1.55,
        fill: { color: "6FA8DC" },
        line: { color: "6FA8DC", width: 0 },
      });
      [-0.36, -0.12, 0.12, 0.36].forEach((dx) =>
        slide.addShape(R.rect, {
          x: cx + dx - 0.04,
          y: 3.33,
          w: 0.08,
          h: 1.35,
          fill: { color: C.navy },
          line: { color: C.navy, width: 0 },
        }),
      );
      slide.addShape(R.rect, {
        x: cx - 0.85,
        y: 4.78,
        w: 1.7,
        h: 0.16,
        fill: { color: C.navy },
        line: { color: C.navy, width: 0 },
      });
      text(slide, p.line || "", {
        x: cx - colW / 2 + 0.6,
        y: 5.05,
        w: colW - 1.2,
        h: 0.5,
        align: "center",
        bold: true,
        fontSize: S.small,
        color: C.ink,
      });
    });
    if (s.footer) {
      const fy = 5.75;
      slide.addShape(R.roundRect, {
        x: G.marginX,
        y: fy,
        w: W - 2 * G.marginX,
        h: 0.8,
        rectRadius: 0.1,
        fill: { color: C.callout },
        line: { color: C.callout, width: 0 },
      });
      const runs = [];
      if (s.footer.label)
        runs.push({
          text: String(s.footer.label).toUpperCase(),
          options: {
            bold: true,
            color: C.teal,
            fontSize: S.caption,
            breakLine: true,
          },
        });
      runs.push({
        text: s.footer.text || "",
        options: { color: C.ink, fontSize: S.small },
      });
      text(slide, runs, {
        x: G.marginX + 0.3,
        y: fy + 0.08,
        w: W - 2 * G.marginX - 0.6,
        h: 0.64,
        valign: "middle",
      });
    }
  },

  "feature-what"(slide, s) {
    titleBlock(slide, s);
    const hasImage = s.image !== undefined || s.imageAlt !== undefined;
    const leftW = hasImage ? 6.0 : W - 2 * G.marginX;
    const top = G.contentTop;
    // 1. What it is + who uses it
    text(slide, "WHAT IT IS", {
      x: G.marginX,
      y: top,
      w: leftW,
      h: 0.3,
      fontFace: F.accent,
      bold: true,
      fontSize: S.caption + 1,
      color: C.teal,
    });
    text(slide, s.what, {
      x: G.marginX,
      y: top + 0.35,
      w: leftW,
      h: 1.2,
      fontSize: fitSize(s.what, S.body, 52, 3),
      color: C.ink,
    });
    const roles = [
      ["Learner", s.users && s.users.learner],
      ["Creator", s.users && s.users.creator],
      ["Reviewer", s.users && s.users.reviewer],
    ].filter((r) => r[1]);
    if (roles.length) {
      const gap = 0.2;
      const cw = (leftW - gap * (roles.length - 1)) / roles.length;
      roles.forEach(([who, what], i) => {
        const x = G.marginX + i * (cw + gap);
        slide.addShape(R.roundRect, {
          x,
          y: top + 1.7,
          w: cw,
          h: 1.45,
          rectRadius: 0.08,
          fill: { color: "F4F7FA" },
          line: { color: C.line, width: 0.75 },
        });
        text(slide, who.toUpperCase(), {
          x: x + 0.15,
          y: top + 1.8,
          w: cw - 0.3,
          h: 0.25,
          fontFace: F.accent,
          bold: true,
          fontSize: S.caption,
          color: C.teal,
        });
        text(slide, what, {
          x: x + 0.15,
          y: top + 2.08,
          w: cw - 0.3,
          h: 1.0,
          fontSize: fitSize(what, S.small, 22, 4),
          color: C.ink,
        });
      });
    }
    // 3. What changed / why it matters, tied to goals; 4. Open questions
    const hasWhy = s.why || (s.goals && s.goals.length);
    const hasOpen = s.openQuestions && s.openQuestions.length;
    let y = top + 3.4;
    if (hasWhy) {
      text(slide, "WHAT CHANGED AND WHY IT MATTERS", {
        x: G.marginX,
        y,
        w: leftW,
        h: 0.3,
        fontFace: F.accent,
        bold: true,
        fontSize: S.caption + 1,
        color: C.teal,
      });
      if (s.why)
        text(slide, s.why, {
          x: G.marginX,
          y: y + 0.33,
          w: leftW,
          h: 0.75,
          fontSize: fitSize(s.why, S.small + 1, 56, 3),
          color: C.ink,
        });
      if (s.goals && s.goals.length) {
        let gx = G.marginX;
        s.goals.forEach((g) => {
          const gw = Math.min(0.28 + String(g).length * 0.095, leftW);
          slide.addShape(R.roundRect, {
            x: gx,
            y: y + 1.12,
            w: gw,
            h: 0.3,
            rectRadius: 0.15,
            fill: { color: C.sail },
            line: { color: C.sail, width: 0 },
          });
          text(slide, g, {
            x: gx,
            y: y + 1.12,
            w: gw,
            h: 0.3,
            align: "center",
            valign: "middle",
            fontSize: S.caption,
            bold: true,
            color: C.navy,
          });
          gx += gw + 0.12;
        });
      }
    }
    if (hasImage) {
      const box = {
        x: G.marginX + leftW + G.gutter,
        y: top,
        w: W - G.marginX - (G.marginX + leftW + G.gutter),
        h: hasOpen ? 3.0 : 4.6,
      };
      picture(slide, box, s.image, s.imageAlt, s.imageLabel);
    }
    if (hasOpen) {
      const ox = hasImage ? G.marginX + leftW + G.gutter : G.marginX;
      const oy = hasImage ? top + 3.25 : y + (hasWhy ? 1.6 : 0);
      const ow = W - G.marginX - ox;
      slide.addShape(R.roundRect, {
        x: ox,
        y: oy,
        w: ow,
        h: Math.min(1.55, G.contentBottom - oy + 0.05),
        rectRadius: 0.08,
        fill: { color: C.callout },
        line: { color: C.callout, width: 0 },
      });
      const runs = [
        {
          text: "OPEN QUESTIONS",
          options: {
            bold: true,
            color: C.teal,
            fontSize: S.caption,
            fontFace: F.accent,
            breakLine: true,
          },
        },
      ];
      s.openQuestions.forEach((q, k) =>
        runs.push({
          text: q,
          options: {
            bullet: { indent: 12 },
            fontSize: S.small,
            breakLine: k < s.openQuestions.length - 1,
          },
        }),
      );
      text(slide, runs, { x: ox + 0.2, y: oy + 0.1, w: ow - 0.4, h: 1.35 });
    }
  },

  "feature-steps"(slide, s) {
    titleBlock(slide, { ...s, subtitle: s.subtitle || "How it works" });
    const n = s.steps.length;
    const gap = 0.3;
    const cw = (W - 2 * G.marginX - gap * (n - 1)) / n;
    const top = G.contentTop + 0.35;
    const imgH = Math.min(cw * 0.8, 3.4);
    s.steps.forEach((st, i) => {
      const x = G.marginX + i * (cw + gap);
      slide.addShape(R.ellipse, {
        x,
        y: top,
        w: 0.4,
        h: 0.4,
        fill: { color: C.navy },
        line: { color: C.navy, width: 0 },
      });
      text(slide, String(i + 1), {
        x,
        y: top,
        w: 0.4,
        h: 0.4,
        align: "center",
        valign: "middle",
        bold: true,
        color: C.white,
        fontSize: S.small,
        fontFace: F.accent,
      });
      if (i < n - 1)
        slide.addShape(R.line, {
          x: x + 0.5,
          y: top + 0.2,
          w: cw + gap - 0.6,
          h: 0,
          line: { color: C.line, width: 1.5 },
        });
      picture(
        slide,
        { x, y: top + 0.6, w: cw, h: imgH },
        st.image,
        st.imageAlt || st.alt,
        st.label || s.label,
      );
      text(slide, st.line, {
        x,
        y: top + 0.75 + imgH,
        w: cw,
        h: 0.9,
        fontSize: fitSize(st.line, S.body - 1, Math.floor(cw * 6.5), 2),
        color: C.ink,
      });
    });
  },

  screenshot(slide, s) {
    titleBlock(slide, s);
    const capH = s.caption ? 0.5 : 0;
    const box = {
      x: G.marginX,
      y: G.contentTop - 0.1,
      w: W - 2 * G.marginX,
      h: G.contentBottom - G.contentTop + 0.1 - capH,
    };
    const used = picture(slide, box, s.image, s.imageAlt, s.label);
    if (s.caption)
      text(slide, s.caption, {
        x: G.marginX,
        y: used.y + used.h + 0.1,
        w: W - 2 * G.marginX,
        h: 0.4,
        align: "center",
        fontSize: S.small,
        color: C.muted,
      });
  },

  "design-questions"(slide, s) {
    titleBlock(slide, { ...s, title: s.title || "Design Questions" });
    const qs = s.questions.map((q) =>
      typeof q === "string" ? { text: q } : q,
    );
    const hasImg = qs.some(
      (q) => q.image !== undefined || q.imageAlt !== undefined,
    );
    if (!hasImg) {
      qs.forEach((q, i) => {
        const y = G.contentTop + 0.1 + i * 1.15;
        slide.addShape(R.ellipse, {
          x: G.marginX,
          y,
          w: 0.55,
          h: 0.55,
          fill: { color: C.teal },
          line: { color: C.teal, width: 0 },
        });
        text(slide, String(i + 1), {
          x: G.marginX,
          y,
          w: 0.55,
          h: 0.55,
          align: "center",
          valign: "middle",
          bold: true,
          color: C.white,
          fontSize: S.body,
          fontFace: F.accent,
        });
        text(slide, q.text, {
          x: G.marginX + 0.85,
          y: y - 0.05,
          w: W - 2 * G.marginX - 0.85,
          h: 0.9,
          fontSize: fitSize(q.text, 22, 70, 2),
          valign: "middle",
        });
      });
      return;
    }
    const n = qs.length;
    const gap = 0.3;
    const cw = (W - 2 * G.marginX - gap * (n - 1)) / n;
    qs.forEach((q, i) => {
      const x = G.marginX + i * (cw + gap);
      picture(
        slide,
        { x, y: G.contentTop, w: cw, h: Math.min(cw * 0.62, 3.0) },
        q.image,
        q.imageAlt,
        q.label,
      );
      text(slide, `${i + 1}.  ${q.text}`, {
        x,
        y: G.contentTop + Math.min(cw * 0.62, 3.0) + 0.2,
        w: cw,
        h: 1.3,
        fontSize: fitSize(q.text, S.body, Math.floor(cw * 6), 3),
        bold: false,
      });
    });
  },

  bullets(slide, s) {
    titleBlock(slide, s);
    text(slide, bulletRuns(s.bullets, S.body + 2), {
      x: G.marginX + 0.2,
      y: G.contentTop + 0.1,
      w: W - 2 * G.marginX - 0.4,
      h: G.contentBottom - G.contentTop - 0.1,
      lineSpacingMultiple: 1.25,
      paraSpaceAfter: 6,
    });
  },

  recap(slide, s) {
    titleBlock(slide, { ...s, title: s.title || "Recap" });
    const n = s.items.length;
    const gap = 0.3;
    const cw = (W - 2 * G.marginX - gap * (n - 1)) / n;
    s.items.forEach((it, i) => {
      const x = G.marginX + i * (cw + gap);
      slide.addShape(R.roundRect, {
        x,
        y: G.contentTop + 0.2,
        w: cw,
        h: 3.3,
        rectRadius: 0.1,
        fill: { color: "F4F7FA" },
        line: { color: C.line, width: 0.75 },
      });
      slide.addShape(R.rect, {
        x,
        y: G.contentTop + 0.2,
        w: cw,
        h: 0.08,
        fill: { color: C.teal },
        line: { color: C.teal, width: 0 },
      });
      text(slide, String(i + 1).padStart(2, "0"), {
        x: x + 0.25,
        y: G.contentTop + 0.5,
        w: cw - 0.5,
        h: 0.5,
        fontFace: F.accent,
        bold: true,
        fontSize: 28,
        color: C.teal,
      });
      text(slide, it.heading, {
        x: x + 0.25,
        y: G.contentTop + 1.1,
        w: cw - 0.5,
        h: 0.9,
        bold: true,
        fontSize: fitSize(it.heading, 20, Math.floor(cw * 5), 2),
        color: C.navy,
      });
      if (it.text)
        text(slide, it.text, {
          x: x + 0.25,
          y: G.contentTop + 2.05,
          w: cw - 0.5,
          h: 1.9,
          fontSize: fitSize(it.text, S.small + 1, Math.floor(cw * 5), 6),
          color: C.ink,
        });
    });
  },

  questions(slide, s) {
    text(slide, s.title || "Questions?", {
      x: 1,
      y: 2.6,
      w: W - 2,
      h: 1.6,
      align: "center",
      valign: "middle",
      fontFace: F.heading,
      bold: true,
      color: C.navy,
      fontSize: 54,
    });
  },

  "thank-you"(slide, s) {
    text(slide, s.title || "Thank you", {
      x: 1,
      y: 2.5,
      w: W - 2,
      h: 1.4,
      align: "center",
      valign: "middle",
      fontFace: F.heading,
      bold: true,
      color: C.navy,
      fontSize: 54,
    });
    if (s.subtitle)
      text(slide, s.subtitle, {
        x: 1,
        y: 4.0,
        w: W - 2,
        h: 0.6,
        align: "center",
        fontSize: S.subtitle,
        color: C.teal,
      });
  },

  appendix(slide, s) {
    const hasBody =
      s.image !== undefined ||
      s.imageAlt !== undefined ||
      (s.bullets && s.bullets.length);
    if (!hasBody) {
      text(slide, "APPENDIX", {
        x: 0,
        y: 2.3,
        w: W,
        h: 0.4,
        align: "center",
        fontFace: F.accent,
        bold: true,
        fontSize: S.body,
        color: C.teal,
      });
      text(slide, s.title, {
        x: 1,
        y: 2.75,
        w: W - 2,
        h: 1.3,
        align: "center",
        valign: "middle",
        fontFace: F.heading,
        bold: true,
        color: C.navy,
        fontSize: 48,
      });
      return;
    }
    titleBlock(slide, { ...s, tag: undefined });
    text(slide, "APPENDIX", {
      x: W - G.marginX - 3,
      y: 0.5,
      w: 3,
      h: 0.4,
      align: "right",
      valign: "middle",
      fontFace: F.accent,
      bold: true,
      fontSize: S.small,
      color: C.teal,
    });
    const hasImg = s.image !== undefined || s.imageAlt !== undefined;
    if (hasImg) {
      const capH = s.caption ? 0.5 : 0;
      const box = {
        x: G.marginX,
        y: G.contentTop - 0.1,
        w: W - 2 * G.marginX,
        h: G.contentBottom - G.contentTop + 0.1 - capH,
      };
      const used = picture(slide, box, s.image, s.imageAlt, s.label);
      if (s.caption)
        text(slide, s.caption, {
          x: G.marginX,
          y: used.y + used.h + 0.1,
          w: W - 2 * G.marginX,
          h: 0.4,
          align: "center",
          fontSize: S.small,
          color: C.muted,
        });
    } else {
      text(slide, bulletRuns(s.bullets, S.body), {
        x: G.marginX + 0.2,
        y: G.contentTop + 0.1,
        w: W - 2 * G.marginX - 0.4,
        h: 4.6,
        lineSpacingMultiple: 1.2,
        paraSpaceAfter: 6,
      });
    }
  },
};

// ----------------------------------------------------------------------- build

outline.slides.forEach((s) => {
  const slide = pres.addSlide({ masterName: "ODYSSEY" });
  layouts[s.layout](slide, s);
  notes(slide, s);
});

await pres.writeFile({ fileName: outPath });
console.log(`Wrote ${outPath} (${outline.slides.length} slides).`);
if (missing.length)
  console.log(
    `Images not found, placeholders used (${missing.length}): ${[...new Set(missing)].join(", ")}`,
  );
