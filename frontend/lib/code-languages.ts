// The languages a code block can run, shared by the client runner
// (code-execution.ts) and the server-side overview scan, so it can't live in
// a "use client" file.

export type LanguageConfig = { pistonName: string; fileName: string };

// Maps the language values used by code blocks (editor dropdown + saved
// content) to the Piston language name and a sensible filename. The proxy
// itself enforces a server-side allowlist; this map only exists to translate
// client-side UI values into the wire format.
export const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
  javascript: { pistonName: "javascript", fileName: "index.js" },
  typescript: { pistonName: "typescript", fileName: "index.ts" },
  python: { pistonName: "python", fileName: "main.py" },
  java: { pistonName: "java", fileName: "Main.java" },
  cpp: { pistonName: "c++", fileName: "main.cpp" },
  "c++": { pistonName: "c++", fileName: "main.cpp" },
  c: { pistonName: "c", fileName: "main.c" },
  csharp: { pistonName: "csharp", fileName: "Main.cs" },
  php: { pistonName: "php", fileName: "index.php" },
  ruby: { pistonName: "ruby", fileName: "main.rb" },
  bash: { pistonName: "bash", fileName: "script.sh" },
  go: { pistonName: "go", fileName: "main.go" },
  rust: { pistonName: "rust", fileName: "main.rs" },
  kotlin: { pistonName: "kotlin", fileName: "Main.kt" },
  swift: { pistonName: "swift", fileName: "main.swift" },
};

export const RUNNABLE_LANGUAGES: readonly string[] =
  Object.keys(LANGUAGE_CONFIG);
