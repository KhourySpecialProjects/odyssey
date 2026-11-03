import "server-only";

import { readFileSync } from "fs";
import path from "path";
import Typo from "typo-js";
import { CONFIG } from "@/lib/overview-scan/config";
import { words } from "@/lib/overview-scan/text";

/**
 * The spell-check behind the Spelling and grammar check (ODY-791): typo-js
 * with the en_US Hunspell dictionary it ships, plus Odyssey's tech word list.
 * Server only: the dictionary is read from node_modules on first use.
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
