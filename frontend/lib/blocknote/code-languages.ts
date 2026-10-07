// Code fence language aliases → code block language values
const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  cs: "csharp",
  "c++": "cpp",
};

/**
 * The code block language for a Markdown code fence's language name, used for
 * code typed or pasted into the editor and for imported Markdown.
 */
export function resolveCodeLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  return LANG_ALIASES[lower] || lower;
}
