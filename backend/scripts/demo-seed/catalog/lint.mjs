// Checks catalog droplets (Markdown) against the rules of the app's Markdown
// importer (frontend/lib/blocknote/markdown-to-blocknote.ts) and the catalog's
// front matter format. See README.md in this folder.
// Usage: node lint.mjs file.md [file.md ...]. Exits 1 if any file has errors.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename } from 'node:path';

const require = createRequire(import.meta.url);
const { TAGS } = require('../content.js');
const people = require('../people.js');
const dropletSchema = require('../../../src/api/droplet/content-types/droplet/schema.json');

const enumOf = (attribute) => dropletSchema.attributes[attribute].enum;
const TYPES = enumOf('type');
const FOCUS = enumOf('focusArea');
const DIFFICULTY = enumOf('difficulty');
const AUTHORS = people
  .allPeople()
  .filter((person) => person.roles.includes(people.ROLES.creator))
  .map((person) => person.key);
const TAG_SLUGS = TAGS.map(([slug]) => slug);
const CALLOUTS = ['warning', 'question', 'important', 'definition', 'more-information', 'caution', 'default'];
const FENCE_LANGUAGES = ['python', 'javascript', 'typescript', 'bash', 'json', 'sql', 'html', 'css', 'text', 'plaintext', 'java'];
const REQUIRED = ['name', 'description', 'overview', 'funFact', 'authors', 'type', 'focusArea', 'difficulty', 'tags', 'objectives'];

function lint(file) {
  const errors = [];
  const warnings = [];
  const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const err = (n, msg) => errors.push(`line ${n}: ${msg}`);
  const warn = (n, msg) => warnings.push(`line ${n}: ${msg}`);

  // Front matter
  if (lines[0] !== '---') return { errors: ['file must start with a --- front matter line'], warnings };
  const end = lines.indexOf('---', 1);
  if (end < 0) return { errors: ['front matter has no closing --- line'], warnings };
  const meta = {};
  let listKey = null;
  for (let n = 1; n < end; n++) {
    const line = lines[n];
    if (!line.trim()) continue;
    const item = line.match(/^- (.+)$/);
    if (item && listKey) {
      meta[listKey].push(item[1].trim());
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) {
      err(n + 1, `front matter line isn't "key: value" or "- item": ${line}`);
      continue;
    }
    const [, key, value] = kv;
    if (key === 'objectives') {
      listKey = key;
      meta[key] = [];
      if (value) err(n + 1, "objectives must be a list of '- ' lines below the key");
    } else {
      listKey = null;
      meta[key] = value.trim();
    }
  }
  for (const key of REQUIRED) {
    if (!(key in meta) || meta[key] === '' || (Array.isArray(meta[key]) && !meta[key].length)) {
      errors.push(`front matter: missing ${key}`);
    }
  }
  for (const key of Object.keys(meta)) if (!REQUIRED.includes(key)) errors.push(`front matter: unknown key ${key}`);
  if (meta.type && !TYPES.includes(meta.type)) errors.push(`front matter: type must be one of ${TYPES}`);
  if (meta.focusArea && !FOCUS.includes(meta.focusArea)) errors.push(`front matter: focusArea must be one of ${FOCUS}`);
  if (meta.difficulty && !DIFFICULTY.includes(meta.difficulty)) {
    errors.push(`front matter: difficulty must be one of ${DIFFICULTY}`);
  }
  for (const author of (meta.authors ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (!AUTHORS.includes(author)) errors.push(`front matter: ${author} isn't a content creator (${AUTHORS})`);
  }
  for (const tag of (meta.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (!TAG_SLUGS.includes(tag)) errors.push(`front matter: unknown tag ${tag} (add it to TAGS in content.js)`);
  }
  if (meta.description && meta.description.length > 160) errors.push('front matter: description over 160 characters');
  if (meta.name && meta.name.length > 60) errors.push('front matter: name over 60 characters');
  if (meta.objectives && (meta.objectives.length < 3 || meta.objectives.length > 4)) {
    errors.push('front matter: give 3 or 4 objectives');
  }
  for (const key of ['name', 'description', 'overview', 'funFact']) {
    if (meta[key] && /[*`<>$|]|\[.*\]\(/.test(meta[key])) {
      errors.push(`front matter: ${key} must be plain text (no markdown, <, >, $ or |)`);
    }
  }
  for (const o of meta.objectives ?? []) if (/[*`<>$|]/.test(o)) errors.push(`front matter: objective must be plain text: ${o}`);

  // Body
  const body = lines.slice(end + 1);
  const offset = end + 2; // 1-based line number of body[0]
  const firstContent = body.findIndex((l) => l.trim());
  if (firstContent < 0 || !body[firstContent].startsWith('# ')) errors.push("body must start with a '# Lesson title' line");

  let inFence = false;
  let fenceStart = 0;
  let lessons = 0;
  let lessonWords = 0;
  let lessonHasQuiz = false;
  let lessonStart = 0;
  const lessonDone = () => {
    if (!lessons) return;
    if (lessonWords < 150) warn(lessonStart, `lesson is short (${lessonWords} words of prose)`);
    if (lessonWords > 650) warn(lessonStart, `lesson is long (${lessonWords} words of prose)`);
    if (!lessonHasQuiz) err(lessonStart, 'lesson has no quiz (end each lesson with one)');
  };

  for (let i = 0; i < body.length; i++) {
    const raw = body[i];
    const line = raw.trim();
    const n = i + offset;

    if (inFence) {
      if (line === '```') inFence = false;
      else if (i - fenceStart > 25) {
        err(fenceStart + offset, 'code block longer than 25 lines');
        fenceStart = 1e9;
      }
      continue;
    }
    if (!line) continue;

    if (line.startsWith('```')) {
      if (raw !== line) err(n, 'code fence must not be indented');
      const lang = line.slice(3).trim();
      if (!lang) err(n, 'code fence needs a language');
      else if (!FENCE_LANGUAGES.includes(lang)) err(n, `code fence language ${lang} isn't one of ${FENCE_LANGUAGES}`);
      inFence = true;
      fenceStart = i;
      continue;
    }
    if (line.startsWith('# ')) {
      lessonDone();
      lessons++;
      lessonWords = 0;
      lessonHasQuiz = false;
      lessonStart = n;
      if (/[*`]/.test(line)) err(n, 'lesson titles must be plain text');
      continue;
    }
    if (/^#{4,}/.test(line)) err(n, 'only #, ## and ### headings are supported');
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      err(n, "horizontal rules aren't supported");
      continue;
    }
    if (/^!\[/.test(line)) err(n, "images aren't supported");
    if (/<\/?[a-z][^>]*>/i.test(line)) err(n, "HTML tags aren't supported");
    if (line.includes('~~')) err(n, "strikethrough (~~) isn't supported by the editor");

    // Quizzes
    if (line.startsWith('%%')) {
      const kind = line.slice(2).trim();
      const items = [];
      let j = i + 1;
      while (j < body.length && body[j].trim().startsWith('-')) {
        if (!body[j].trim().startsWith('- ')) err(j + offset, "quiz items start with '- '");
        items.push(body[j].trim().slice(2).trim());
        j++;
      }
      if (j < body.length && body[j].trim()) err(j + offset, 'leave a blank line after a quiz');
      if (!['true-false', 'multiple-choice', 'open-ended'].includes(kind)) err(n, `unknown quiz type ${kind}`);
      if (kind === 'true-false' && (items.length !== 2 || !['true', 'false'].includes(items[1]))) {
        err(n, "true-false quiz: '- statement' then '- true' or '- false'");
      }
      if (kind === 'open-ended' && items.length !== 2) err(n, "open-ended quiz: '- question' then '- model answer'");
      if (kind === 'multiple-choice') {
        const options = items.slice(1);
        if (options.length < 3 || options.length > 5) err(n, 'multiple-choice quiz: a question and 3 to 5 options');
        if (options.filter((o) => o.endsWith(' <')).length !== 1) {
          err(n, "multiple-choice quiz: mark exactly one option with ' <' at the end");
        }
      }
      for (const item of items) {
        if (/[*`$|]|\[.*\]\(/.test(item.replace(/ <$/, ''))) err(n, `quiz text must be plain (no markdown, $ or |): ${item}`);
      }
      lessonHasQuiz = true;
      i = j - 1;
      continue;
    }
    // Callouts
    if (line.startsWith('%')) {
      const m = line.match(/^%(\S+)\s+(.+)$/);
      if (!m || !CALLOUTS.includes(m[1])) err(n, `callout must be '%type text' with a type from ${CALLOUTS}`);
      else if (/[*`$|]|\[.*\]\(/.test(m[2])) err(n, 'callout text must be plain (no markdown, $ or |)');
      lessonWords += line.split(/\s+/).length;
      continue;
    }
    // Math blocks
    if (line.startsWith('$$')) {
      if (!(line.length > 4 && line.endsWith('$$'))) err(n, 'write $$ math $$ on a single line');
      continue;
    }
    // Tables
    if (line.includes('|')) {
      const rows = [];
      let j = i;
      while (j < body.length && body[j].trim().includes('|')) {
        rows.push(body[j].trim());
        j++;
      }
      if (rows.length === 1) {
        err(n, 'a | outside a table or code block (two such lines in a row turn into a table)');
        continue;
      }
      if (!/^\|?\s*:?-{3,}/.test(rows[1])) err(n + 1, "table's second line must be the |---|---| separator");
      const cells = (r) =>
        r
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c);
      const width = cells(rows[0]).length;
      rows.forEach((r, k) => {
        if (k === 1) return;
        const c = cells(r);
        const rawCells = r.replace(/^\|/, '').replace(/\|$/, '').split('|');
        if (rawCells.some((x) => !x.trim())) err(n + k, "table cells can't be empty");
        if (c.length !== width) err(n + k, `table row has ${c.length} cells, header has ${width}`);
        if (c.some((x) => /[*`$]|\[.*\]\(/.test(x))) err(n + k, 'table cells must be plain text (no markdown or $)');
      });
      lessonWords += rows.join(' ').split(/\s+/).length;
      i = j - 1;
      continue;
    }
    // Lists
    if (/^\s+\d+\.\s/.test(raw)) err(n, "numbered lists can't be nested");
    if (/^ [-*]\s/.test(raw)) err(n, 'nest bullets with 2 or more spaces');
    if (line.startsWith('* ')) warn(n, "use '- ' for bullets");

    // Inline checks for paragraphs, headings and list items
    const withoutCode = line.replace(/`[^`]+`/g, '');
    if ((withoutCode.match(/`/g) ?? []).length) err(n, 'unclosed inline code backtick');
    if (withoutCode.includes('***')) err(n, "don't use *** (bold italic)");
    const stars = withoutCode
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/^\s*[-*]\s/, '');
    if ((stars.match(/\*/g) ?? []).length % 2) {
      err(n, 'stray * outside inline code (it starts italics); put code like SELECT * in backticks');
    }
    const dollars = withoutCode.replace(/\$\$/g, '');
    if ((dollars.match(/\$/g) ?? []).length % 2) {
      err(n, "a single $ is read as math; write money as '5 dollars' or put code in backticks");
    }
    for (const m of withoutCode.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)) {
      if (!/^https:\/\//.test(m[2])) err(n, `links must be https:// URLs: ${m[2]}`);
    }
    if (!/^\d+\.\s/.test(line) && /^[A-Za-z]/.test(line) && !/[.?!:)"'`]$/.test(line)) {
      const next = (body[i + 1] ?? '').trim();
      if (next && /^[a-z]/.test(next)) {
        warn(n, 'looks hard-wrapped: every line becomes its own paragraph, so keep a paragraph on one line');
      }
    }
    lessonWords += line
      .replace(/^[-#\d.\s]+/, '')
      .split(/\s+/)
      .filter(Boolean).length;
  }
  if (inFence) err(fenceStart + offset, 'code fence never closed');
  lessonDone();
  if (lessons < 2 || lessons > 4) errors.push(`droplet has ${lessons} lessons; give it 2 to 4`);
  return { errors, warnings };
}

let failed = false;
for (const file of process.argv.slice(2)) {
  const { errors, warnings } = lint(file);
  if (errors.length) failed = true;
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${basename(file)}${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
  for (const e of errors) console.log(`  error   ${e}`);
  for (const w of warnings) console.log(`  warning ${w}`);
}
process.exit(failed ? 1 : 0);
