// highlight.js with the languages the app supports (see
// components/ui/code-editor.tsx) plus markup/css/sql/plaintext registered up
// front, instead of the full 192-language build. Lessons can use any language
// the editor offers (all of lowlight's list), so every other grammar is fetched
// on demand as its own chunk (see loadLanguages). Load this module with a
// dynamic import() so it stays out of the initial bundle.
import hljs from "highlight.js/lib/core";
import type { LanguageFn } from "highlight.js";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import php from "highlight.js/lib/languages/php";
import rust from "highlight.js/lib/languages/rust";
import json from "highlight.js/lib/languages/json";
import go from "highlight.js/lib/languages/go";
import ruby from "highlight.js/lib/languages/ruby";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import csharp from "highlight.js/lib/languages/csharp";
import kotlin from "highlight.js/lib/languages/kotlin";
import swift from "highlight.js/lib/languages/swift";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import plaintext from "highlight.js/lib/languages/plaintext";

hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("java", java);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("php", php);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("json", json);
hljs.registerLanguage("go", go);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("plaintext", plaintext);

// Auto-detection (code blocks without a language class) only considers the
// eagerly registered languages, so its results don't depend on which grammars
// happen to have been loaded earlier in the session.
hljs.configure({ languages: hljs.listLanguages() });

// Every other highlight.js language, one lazy chunk each. These have to be
// static specifiers: the package's "exports" field doesn't expose the
// lib/languages directory, so a template-literal import() fails to resolve at
// build time.
type LanguageLoader = () => Promise<{ default: LanguageFn }>;
const LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  "1c": () => import("highlight.js/lib/languages/1c"),
  abnf: () => import("highlight.js/lib/languages/abnf"),
  accesslog: () => import("highlight.js/lib/languages/accesslog"),
  actionscript: () => import("highlight.js/lib/languages/actionscript"),
  ada: () => import("highlight.js/lib/languages/ada"),
  angelscript: () => import("highlight.js/lib/languages/angelscript"),
  apache: () => import("highlight.js/lib/languages/apache"),
  applescript: () => import("highlight.js/lib/languages/applescript"),
  arcade: () => import("highlight.js/lib/languages/arcade"),
  arduino: () => import("highlight.js/lib/languages/arduino"),
  armasm: () => import("highlight.js/lib/languages/armasm"),
  asciidoc: () => import("highlight.js/lib/languages/asciidoc"),
  aspectj: () => import("highlight.js/lib/languages/aspectj"),
  autohotkey: () => import("highlight.js/lib/languages/autohotkey"),
  autoit: () => import("highlight.js/lib/languages/autoit"),
  avrasm: () => import("highlight.js/lib/languages/avrasm"),
  awk: () => import("highlight.js/lib/languages/awk"),
  axapta: () => import("highlight.js/lib/languages/axapta"),
  basic: () => import("highlight.js/lib/languages/basic"),
  bnf: () => import("highlight.js/lib/languages/bnf"),
  brainfuck: () => import("highlight.js/lib/languages/brainfuck"),
  cal: () => import("highlight.js/lib/languages/cal"),
  capnproto: () => import("highlight.js/lib/languages/capnproto"),
  ceylon: () => import("highlight.js/lib/languages/ceylon"),
  clean: () => import("highlight.js/lib/languages/clean"),
  "clojure-repl": () => import("highlight.js/lib/languages/clojure-repl"),
  clojure: () => import("highlight.js/lib/languages/clojure"),
  cmake: () => import("highlight.js/lib/languages/cmake"),
  coffeescript: () => import("highlight.js/lib/languages/coffeescript"),
  coq: () => import("highlight.js/lib/languages/coq"),
  cos: () => import("highlight.js/lib/languages/cos"),
  crmsh: () => import("highlight.js/lib/languages/crmsh"),
  crystal: () => import("highlight.js/lib/languages/crystal"),
  csp: () => import("highlight.js/lib/languages/csp"),
  d: () => import("highlight.js/lib/languages/d"),
  dart: () => import("highlight.js/lib/languages/dart"),
  delphi: () => import("highlight.js/lib/languages/delphi"),
  diff: () => import("highlight.js/lib/languages/diff"),
  django: () => import("highlight.js/lib/languages/django"),
  dns: () => import("highlight.js/lib/languages/dns"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  dos: () => import("highlight.js/lib/languages/dos"),
  dsconfig: () => import("highlight.js/lib/languages/dsconfig"),
  dts: () => import("highlight.js/lib/languages/dts"),
  dust: () => import("highlight.js/lib/languages/dust"),
  ebnf: () => import("highlight.js/lib/languages/ebnf"),
  elixir: () => import("highlight.js/lib/languages/elixir"),
  elm: () => import("highlight.js/lib/languages/elm"),
  erb: () => import("highlight.js/lib/languages/erb"),
  "erlang-repl": () => import("highlight.js/lib/languages/erlang-repl"),
  erlang: () => import("highlight.js/lib/languages/erlang"),
  excel: () => import("highlight.js/lib/languages/excel"),
  fix: () => import("highlight.js/lib/languages/fix"),
  flix: () => import("highlight.js/lib/languages/flix"),
  fortran: () => import("highlight.js/lib/languages/fortran"),
  fsharp: () => import("highlight.js/lib/languages/fsharp"),
  gams: () => import("highlight.js/lib/languages/gams"),
  gauss: () => import("highlight.js/lib/languages/gauss"),
  gcode: () => import("highlight.js/lib/languages/gcode"),
  gherkin: () => import("highlight.js/lib/languages/gherkin"),
  glsl: () => import("highlight.js/lib/languages/glsl"),
  gml: () => import("highlight.js/lib/languages/gml"),
  golo: () => import("highlight.js/lib/languages/golo"),
  gradle: () => import("highlight.js/lib/languages/gradle"),
  graphql: () => import("highlight.js/lib/languages/graphql"),
  groovy: () => import("highlight.js/lib/languages/groovy"),
  haml: () => import("highlight.js/lib/languages/haml"),
  handlebars: () => import("highlight.js/lib/languages/handlebars"),
  haskell: () => import("highlight.js/lib/languages/haskell"),
  haxe: () => import("highlight.js/lib/languages/haxe"),
  hsp: () => import("highlight.js/lib/languages/hsp"),
  http: () => import("highlight.js/lib/languages/http"),
  hy: () => import("highlight.js/lib/languages/hy"),
  inform7: () => import("highlight.js/lib/languages/inform7"),
  ini: () => import("highlight.js/lib/languages/ini"),
  irpf90: () => import("highlight.js/lib/languages/irpf90"),
  isbl: () => import("highlight.js/lib/languages/isbl"),
  "jboss-cli": () => import("highlight.js/lib/languages/jboss-cli"),
  "julia-repl": () => import("highlight.js/lib/languages/julia-repl"),
  julia: () => import("highlight.js/lib/languages/julia"),
  lasso: () => import("highlight.js/lib/languages/lasso"),
  latex: () => import("highlight.js/lib/languages/latex"),
  ldif: () => import("highlight.js/lib/languages/ldif"),
  leaf: () => import("highlight.js/lib/languages/leaf"),
  less: () => import("highlight.js/lib/languages/less"),
  lisp: () => import("highlight.js/lib/languages/lisp"),
  livecodeserver: () => import("highlight.js/lib/languages/livecodeserver"),
  livescript: () => import("highlight.js/lib/languages/livescript"),
  llvm: () => import("highlight.js/lib/languages/llvm"),
  lsl: () => import("highlight.js/lib/languages/lsl"),
  lua: () => import("highlight.js/lib/languages/lua"),
  makefile: () => import("highlight.js/lib/languages/makefile"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  mathematica: () => import("highlight.js/lib/languages/mathematica"),
  matlab: () => import("highlight.js/lib/languages/matlab"),
  maxima: () => import("highlight.js/lib/languages/maxima"),
  mel: () => import("highlight.js/lib/languages/mel"),
  mercury: () => import("highlight.js/lib/languages/mercury"),
  mipsasm: () => import("highlight.js/lib/languages/mipsasm"),
  mizar: () => import("highlight.js/lib/languages/mizar"),
  mojolicious: () => import("highlight.js/lib/languages/mojolicious"),
  monkey: () => import("highlight.js/lib/languages/monkey"),
  moonscript: () => import("highlight.js/lib/languages/moonscript"),
  n1ql: () => import("highlight.js/lib/languages/n1ql"),
  nestedtext: () => import("highlight.js/lib/languages/nestedtext"),
  nginx: () => import("highlight.js/lib/languages/nginx"),
  nim: () => import("highlight.js/lib/languages/nim"),
  nix: () => import("highlight.js/lib/languages/nix"),
  "node-repl": () => import("highlight.js/lib/languages/node-repl"),
  nsis: () => import("highlight.js/lib/languages/nsis"),
  objectivec: () => import("highlight.js/lib/languages/objectivec"),
  ocaml: () => import("highlight.js/lib/languages/ocaml"),
  openscad: () => import("highlight.js/lib/languages/openscad"),
  oxygene: () => import("highlight.js/lib/languages/oxygene"),
  parser3: () => import("highlight.js/lib/languages/parser3"),
  perl: () => import("highlight.js/lib/languages/perl"),
  pf: () => import("highlight.js/lib/languages/pf"),
  pgsql: () => import("highlight.js/lib/languages/pgsql"),
  "php-template": () => import("highlight.js/lib/languages/php-template"),
  pony: () => import("highlight.js/lib/languages/pony"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  processing: () => import("highlight.js/lib/languages/processing"),
  profile: () => import("highlight.js/lib/languages/profile"),
  prolog: () => import("highlight.js/lib/languages/prolog"),
  properties: () => import("highlight.js/lib/languages/properties"),
  protobuf: () => import("highlight.js/lib/languages/protobuf"),
  puppet: () => import("highlight.js/lib/languages/puppet"),
  purebasic: () => import("highlight.js/lib/languages/purebasic"),
  "python-repl": () => import("highlight.js/lib/languages/python-repl"),
  q: () => import("highlight.js/lib/languages/q"),
  qml: () => import("highlight.js/lib/languages/qml"),
  r: () => import("highlight.js/lib/languages/r"),
  reasonml: () => import("highlight.js/lib/languages/reasonml"),
  rib: () => import("highlight.js/lib/languages/rib"),
  roboconf: () => import("highlight.js/lib/languages/roboconf"),
  routeros: () => import("highlight.js/lib/languages/routeros"),
  rsl: () => import("highlight.js/lib/languages/rsl"),
  ruleslanguage: () => import("highlight.js/lib/languages/ruleslanguage"),
  sas: () => import("highlight.js/lib/languages/sas"),
  scala: () => import("highlight.js/lib/languages/scala"),
  scheme: () => import("highlight.js/lib/languages/scheme"),
  scilab: () => import("highlight.js/lib/languages/scilab"),
  scss: () => import("highlight.js/lib/languages/scss"),
  smali: () => import("highlight.js/lib/languages/smali"),
  smalltalk: () => import("highlight.js/lib/languages/smalltalk"),
  sml: () => import("highlight.js/lib/languages/sml"),
  sqf: () => import("highlight.js/lib/languages/sqf"),
  stan: () => import("highlight.js/lib/languages/stan"),
  stata: () => import("highlight.js/lib/languages/stata"),
  step21: () => import("highlight.js/lib/languages/step21"),
  stylus: () => import("highlight.js/lib/languages/stylus"),
  subunit: () => import("highlight.js/lib/languages/subunit"),
  taggerscript: () => import("highlight.js/lib/languages/taggerscript"),
  tap: () => import("highlight.js/lib/languages/tap"),
  tcl: () => import("highlight.js/lib/languages/tcl"),
  thrift: () => import("highlight.js/lib/languages/thrift"),
  tp: () => import("highlight.js/lib/languages/tp"),
  twig: () => import("highlight.js/lib/languages/twig"),
  vala: () => import("highlight.js/lib/languages/vala"),
  vbnet: () => import("highlight.js/lib/languages/vbnet"),
  "vbscript-html": () => import("highlight.js/lib/languages/vbscript-html"),
  vbscript: () => import("highlight.js/lib/languages/vbscript"),
  verilog: () => import("highlight.js/lib/languages/verilog"),
  vhdl: () => import("highlight.js/lib/languages/vhdl"),
  vim: () => import("highlight.js/lib/languages/vim"),
  wasm: () => import("highlight.js/lib/languages/wasm"),
  wren: () => import("highlight.js/lib/languages/wren"),
  x86asm: () => import("highlight.js/lib/languages/x86asm"),
  xl: () => import("highlight.js/lib/languages/xl"),
  xquery: () => import("highlight.js/lib/languages/xquery"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  zephir: () => import("highlight.js/lib/languages/zephir"),
};

// The class names highlight.js reads a block's language from (language-* or
// lang-* on the code element or its parent), matching its own detection.
const LANGUAGE_CLASS_RE = /\blang(?:uage)?-([\w-]+)\b/i;

function blockLanguage(block: HTMLElement): string | null {
  const classes = `${block.className} ${block.parentElement?.className ?? ""}`;
  return LANGUAGE_CLASS_RE.exec(classes)?.[1].toLowerCase() ?? null;
}

function canLoad(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_LOADERS, name);
}

// Shared per language so blocks that need the same grammar fetch it once
const languagePromises = new Map<string, Promise<void>>();

function loadLanguage(name: string): Promise<void> {
  let promise = languagePromises.get(name);
  if (!promise) {
    promise = LANGUAGE_LOADERS[name]()
      .then((mod) => {
        if (!hljs.getLanguage(name)) hljs.registerLanguage(name, mod.default);
      })
      .catch((error) => {
        // Allow a later render to retry (e.g. after a transient chunk failure)
        languagePromises.delete(name);
        throw error;
      });
    languagePromises.set(name, promise);
  }
  return promise;
}

/**
 * Loads the grammar for every language used by `pre code` blocks under `root`
 * that isn't registered yet. Unknown language names are ignored. Never
 * rejects; resolves to true if any of those languages is now registered, i.e.
 * re-highlighting would change something.
 */
export async function loadLanguages(
  root: ParentNode = document,
): Promise<boolean> {
  const missing = new Set<string>();
  root.querySelectorAll<HTMLElement>("pre code").forEach((block) => {
    const name = blockLanguage(block);
    if (name && !hljs.getLanguage(name) && canLoad(name)) missing.add(name);
  });
  if (missing.size === 0) return false;

  const names = Array.from(missing);
  const results = await Promise.allSettled(names.map(loadLanguage));
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to load syntax highlighting for "${names[i]}":`,
        result.reason,
      );
    }
  });
  return names.some((name) => hljs.getLanguage(name) !== undefined);
}

/**
 * Highlights the `pre code` blocks under `root` one at a time, so a block that
 * fails can't stop the others. Blocks whose language isn't registered (unknown
 * name, or its grammar hasn't loaded) are left as plain text.
 */
export function highlightCodeBlocks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("pre code").forEach((block) => {
    if (block.dataset.highlighted) return;
    const name = blockLanguage(block);
    if (name && !hljs.getLanguage(name)) return;
    try {
      hljs.highlightElement(block);
    } catch (error) {
      console.error("Failed to highlight code block:", error);
    }
  });
}

export default hljs;
