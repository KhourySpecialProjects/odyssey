"use client";

// Shared execution helper for both the BlockNote editor code block and the
// student-facing CodeBlockViewer. Python runs in-browser via Pyodide; every
// other language goes through the auth-gated /api/run-code proxy.
const RUN_CODE_URL = "/api/run-code";

export type ExecResult = { success: boolean; output: string };

type LanguageConfig = { pistonName: string; fileName: string };

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

async function executePython(code: string): Promise<ExecResult> {
  try {
    const { runPython } = await import("@/lib/pyodide/runtime");
    const result = await runPython(code);
    if (result.error) {
      return { success: false, output: result.error.trim() };
    }
    const out =
      (result.stdout || "").trim() || "Code executed successfully (no output)";
    return { success: true, output: out };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: `Execution error: ${msg}` };
  }
}

async function executeViaProxy(
  language: string,
  code: string,
): Promise<ExecResult> {
  const cfg = LANGUAGE_CONFIG[language];
  if (!cfg) {
    return {
      success: false,
      output: `Language ${language} is not supported for execution`,
    };
  }

  try {
    const response = await fetch(RUN_CODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: cfg.pistonName,
        code,
        fileName: cfg.fileName,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body?.error ?? `Execution service error (${response.status})`;
      return { success: false, output: msg };
    }

    const result = await response.json();

    if (result.compile && result.compile.code !== 0) {
      return {
        success: false,
        output:
          result.compile.stderr ||
          result.compile.output ||
          "Compilation failed",
      };
    }

    // Treat any non-zero run exit as a failure so silent failures
    // (exit(1) with no stderr) aren't shown as success.
    if (result.run && result.run.code !== 0) {
      const errOut =
        (result.run.stderr || "").trim() ||
        (result.run.output || "").trim() ||
        (result.run.stdout || "").trim() ||
        `Process exited with code ${result.run.code}`;
      return { success: false, output: errOut };
    }

    const output =
      result.run?.stdout ||
      result.run?.output ||
      "Code executed successfully (no output)";
    return { success: true, output: String(output).trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: `Execution error: ${msg}` };
  }
}

export async function executeCode(
  language: string,
  code: string,
): Promise<ExecResult> {
  if (language === "python") return executePython(code);
  return executeViaProxy(language, code);
}
