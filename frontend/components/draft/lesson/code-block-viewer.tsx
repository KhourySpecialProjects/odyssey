"use client";

import { useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
// Import languages
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import c from "react-syntax-highlighter/dist/esm/languages/hljs/c";
import csharp from "react-syntax-highlighter/dist/esm/languages/hljs/csharp";
import php from "react-syntax-highlighter/dist/esm/languages/hljs/php";
import ruby from "react-syntax-highlighter/dist/esm/languages/hljs/ruby";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";
import rust from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import kotlin from "react-syntax-highlighter/dist/esm/languages/hljs/kotlin";
import swift from "react-syntax-highlighter/dist/esm/languages/hljs/swift";
import { Play, Edit, Check, X, AlertCircle, Loader2 } from "lucide-react";

// Register languages
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("php", php);
SyntaxHighlighter.registerLanguage("ruby", ruby);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("kotlin", kotlin);
SyntaxHighlighter.registerLanguage("swift", swift);

// Register languages
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("php", php);
SyntaxHighlighter.registerLanguage("ruby", ruby);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("kotlin", kotlin);
SyntaxHighlighter.registerLanguage("swift", swift);

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  php: "PHP",
  ruby: "Ruby",
  bash: "Bash",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  swift: "Swift",
};

const executePistonCode = async (
  language: string,
  code: string,
  fileName: string,
  pistonLanguageName: string,
) => {
  try {
    const response = await fetch(PISTON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: pistonLanguageName,
        version: "*",
        files: [{ name: fileName, content: code }],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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

    if (result.run.code !== 0 && result.run.stderr) {
      return {
        success: false,
        output: result.run.stderr,
      };
    }

    const output =
      result.run.stdout ||
      result.run.output ||
      "Code executed successfully (no output)";
    return {
      success: true,
      output: output.trim(),
    };
  } catch (error: any) {
    return {
      success: false,
      output: `Execution error: ${error.message}`,
    };
  }
};

interface CodeBlockViewerProps {
  language: string;
  code: string;
  editable: boolean;
  runnable: boolean;
}

export function CodeBlockViewer({
  language,
  code: initialCode,
  editable,
  runnable,
}: CodeBlockViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState(true);

  const languageLabel = LANGUAGE_LABELS[language] || language;

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");
    setExecutionSuccess(true);

    try {
      // Map language to Piston language name
      const pistonLanguageMap: Record<string, string> = {
        javascript: "javascript",
        typescript: "typescript",
        python: "python",
        java: "java",
        cpp: "c++",
        c: "c",
        csharp: "csharp",
        php: "php",
        ruby: "ruby",
        bash: "bash",
        go: "go",
        rust: "rust",
        kotlin: "kotlin",
        swift: "swift",
      };

      // Get proper file name for language
      const fileNames: Record<string, string> = {
        javascript: "index.js",
        typescript: "index.ts",
        python: "main.py",
        java: "Main.java",
        cpp: "main.cpp",
        c: "main.c",
        csharp: "Main.cs",
        php: "index.php",
        ruby: "main.rb",
        bash: "script.sh",
        go: "main.go",
        rust: "main.rs",
        kotlin: "Main.kt",
        swift: "main.swift",
      };

      const pistonLanguage = pistonLanguageMap[language] || language;
      const fileName = fileNames[language] || "main.txt";
      const result = await executePistonCode(
        language,
        code,
        fileName,
        pistonLanguage,
      );
      setOutput(result.output);
      setExecutionSuccess(result.success);
    } catch (error: any) {
      setOutput(`Unexpected error: ${error.message}`);
      setExecutionSuccess(false);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="my-4 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <span className="text-sm font-medium text-gray-200">
          {languageLabel}
        </span>
        {runnable && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <Play size={12} />
            Runnable
          </span>
        )}
      </div>

      {/* Code Display/Editor */}
      <div className="relative">
        {isEditing && editable ? (
          <div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full resize-none bg-gray-900 p-4 font-mono text-sm text-gray-100 outline-none"
              rows={Math.max(5, code.split("\n").length)}
              style={{ minHeight: "120px" }}
              spellCheck={false}
            />
            <div className="flex gap-2 border-t border-gray-700 bg-gray-800 p-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
              >
                <Check size={14} />
                Done
              </button>
              <button
                onClick={() => {
                  setCode(initialCode);
                  setIsEditing(false);
                }}
                className="flex items-center gap-1 rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
              >
                <X size={14} />
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div
            className="group relative cursor-pointer"
            onClick={() => editable && setIsEditing(true)}
          >
            {/* @ts-ignore - SyntaxHighlighter React 18 compatibility */}
            <SyntaxHighlighter
              language={language}
              style={atomOneDark}
              customStyle={{
                margin: 0,
                padding: "1rem",
                background: "transparent",
              }}
              PreTag="div"
            >
              {code || "// Code here"}
            </SyntaxHighlighter>
            {editable && (
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
                  Click to edit
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Run Button and Output */}
      {runnable && (
        <div className="border-t border-gray-700">
          <div className="bg-gray-800 p-2">
            <button
              onClick={runCode}
              disabled={isRunning}
              className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Code
                </>
              )}
            </button>
          </div>

          {output && (
            <div
              className={`border-t p-4 ${
                executionSuccess
                  ? "border-gray-700 bg-gray-950"
                  : "border-red-700/30 bg-red-950/20"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs">
                {executionSuccess ? (
                  <span className="font-medium text-gray-400">Output:</span>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="font-medium text-red-400">Error:</span>
                  </>
                )}
              </div>
              <pre
                className={`font-mono text-sm whitespace-pre-wrap ${
                  executionSuccess ? "text-green-400" : "text-red-300"
                }`}
              >
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
