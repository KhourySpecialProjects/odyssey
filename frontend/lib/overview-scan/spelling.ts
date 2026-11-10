import "server-only";

import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import path from "path";
import Typo from "typo-js";
import { CONFIG } from "@/lib/overview-scan/config";
import { words } from "@/lib/overview-scan/text";

/**
 * The spell-check behind the Spelling and grammar check (ODY-791): typo-js
 * with the en_US Hunspell dictionary it ships, plus Odyssey's tech word list
 * and cspell's software, company and full-stack word lists (ODY-924). A word
 * is flagged only when it looks like a typo of a real word, so names, products
 * and made-up identifiers pass without an AI call. Server only: the word lists
 * are read from node_modules on first use.
 */

let dictionary: Typo | null = null;

function loadDictionary(): Typo {
  if (!dictionary) {
    const dir = path.join(
      process.cwd(),
      "node_modules/typo-js/dictionaries/en_US",
    );
    dictionary = new Typo(
      "en_US",
      readFileSync(path.join(dir, "en_US.aff"), "utf8"),
      readFileSync(path.join(dir, "en_US.dic"), "utf8"),
    );
  }
  return dictionary;
}

const TECH_WORDS = new Set(CONFIG.techWords);

/** Words a dictionary can't judge: acronyms, code names and numbers ("API", "useState", "v2"). */
const skipped = (word: string) =>
  word.length < 2 || /\d/.test(word) || /[A-Z].*[A-Z]|[a-z][A-Z]/.test(word);

/**
 * The distinct words in `text` that are in neither the dictionary nor the
 * tech word list. Words inside the block's inline `code` aren't checked.
 */
export function unknownWords(
  text: string,
  code: readonly string[] = [],
): string[] {
  const dict = loadDictionary();
  const inCode = new Set(code.flatMap(words));
  const known = (w: string) =>
    skipped(w) ||
    TECH_WORDS.has(w.toLowerCase()) ||
    dict.check(w) ||
    dict.check(w.toLowerCase());
  const unknown = new Set<string>();
  for (const token of words(text)) {
    if (inCode.has(token)) continue;
    const word = token.replace(/’/g, "'");
    if (known(word) || known(word.replace(/'s$/i, ""))) continue;
    // A hyphenated word is right when each of its parts is
    if (word.includes("-") && word.split("-").every(known)) continue;
    unknown.add(token);
  }
  return [...unknown];
}

// ---------------------------------------------------------------------------
// Which unknown words are typos (ODY-924)

const CSPELL = path.join(process.cwd(), "node_modules/@cspell");
const readList = (file: string) =>
  readFileSync(path.join(CSPELL, file)).toString("utf8");

let extra: Set<string> | null = null;
let roots: Set<string> | null = null;

/** Plain-text word lines of cspell's software, company and full-stack lists. */
function extraWords(): Set<string> {
  if (!extra) {
    const text = [
      gunzipSync(
        readFileSync(
          path.join(CSPELL, "dict-software-terms/dict/softwareTerms.txt.gz"),
        ),
      ).toString("utf8"),
      readList("dict-software-terms/dict/software-tools.txt"),
      readList("dict-companies/dict/companies.txt"),
      readList("dict-fullstack/dict/fullstack.txt"),
    ].join("\n");
    extra = new Set(
      text
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith("#") && line.length >= 4),
    );
  }
  return extra;
}

/** The lowercase root words of en_US.dic, for the two-edit lookup. */
function rootWords(): Set<string> {
  if (!roots) {
    const dic = readFileSync(
      path.join(
        process.cwd(),
        "node_modules/typo-js/dictionaries/en_US/en_US.dic",
      ),
      "utf8",
    );
    roots = new Set(
      dic
        .split("\n")
        .slice(1)
        .map((line) => line.split("/")[0].toLowerCase()),
    );
  }
  return roots;
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** Every string one deletion, swap, replacement or insertion away (Norvig). */
function edits1(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i <= word.length; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);
    if (right) out.push(left + right.slice(1));
    if (right.length > 1) out.push(left + right[1] + right[0] + right.slice(2));
    for (const c of LETTERS) {
      if (right) out.push(left + c + right.slice(1));
      out.push(left + c + right);
    }
  }
  return out;
}

/** Whether `word` is one or two edits from a real word it was probably meant to be. */
function nearRealWord(word: string): boolean {
  const dict = loadDictionary();
  const real = (w: string) =>
    w.length >= 3 &&
    (dict.check(w) || rootWords().has(w) || extraWords().has(w));
  if (word.length < 3) return false;
  // A short word is a typo only when two letters are swapped ("teh"): one
  // edit from a short word is too often an abbreviation ("tv", "lol")
  if (word.length === 3) {
    return [...word].some(
      (_, i) =>
        i < 2 &&
        real(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2)),
    );
  }
  const first = edits1(word);
  if (first.some(real)) return true;
  if (word.length < 8) return false;
  const roots = rootWords();
  return first.some((a) =>
    edits1(a).some((b) => b.length >= 4 && roots.has(b)),
  );
}

/** What the whole droplet says about a word: where it's code, how often it's used. */
export type SpellingContext = {
  codeWords: ReadonlySet<string>;
  counts: ReadonlyMap<string, number>;
};

/** `texts` is all the droplet's readable text; `code` all its code and inline code. */
export function spellingContext(
  texts: readonly string[],
  code: readonly string[],
): SpellingContext {
  const counts = new Map<string, number>();
  for (const w of texts.flatMap(words)) {
    const key = w.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return {
    codeWords: new Set(code.flatMap(words).map((w) => w.toLowerCase())),
    counts,
  };
}

/** Whether the match at `index` starts a sentence, a list item or a table cell. */
const startsSentence = (text: string, index: number) =>
  /(^|[.!?:|\n]\s*)$/.test(text.slice(0, index));

/**
 * The distinct words in `text` that look like typos: not in the dictionary,
 * but a real word one or two edits away. Skipped: capitalised words that
 * don't start a sentence (names, products), words in any code in the droplet,
 * words used 3 or more times, and hyphenated or apostrophe words.
 */
export function likelyTypos(
  text: string,
  context: SpellingContext,
  code: readonly string[] = [],
): string[] {
  const unknown = new Set(unknownWords(text, code));
  const found = new Set<string>();
  for (const m of text.matchAll(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)) {
    const token = m[0];
    const lower = token.toLowerCase();
    if (!unknown.has(token) || found.has(token)) continue;
    if (!/^[A-Za-z]+$/.test(token)) continue;
    if (/^[A-Z]/.test(token) && !startsSentence(text, m.index)) continue;
    if (context.codeWords.has(lower)) continue;
    if ((context.counts.get(lower) ?? 0) >= 3) continue;
    if (nearRealWord(lower)) found.add(token);
  }
  return [...found];
}
