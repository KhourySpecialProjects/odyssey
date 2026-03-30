"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useState, useEffect, useRef, ErrorInfo } from "react";
import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomOneDark,
  githubGist,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import {
  Play,
  Loader2,
  Edit,
  Lock,
  CheckCircle2,
  XCircle,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { usePyodide } from "@/lib/pyodide/pyodide-context";
import { useDatasets } from "@/lib/contexts/dataset-context";
import type { ExecutionResult } from "@/lib/pyodide/runtime";

SyntaxHighlighter.registerLanguage("python", python);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NotebookCodeBlockComponent = ({ block, editor }: any) => {
  const [code, setCode] = useState<string>(block.props.code || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [executionCount, setExecutionCount] = useState<number | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    { passed: boolean; message: string }[] | null
  >(null);
  const [showTestEditor, setShowTestEditor] = useState(false);
  const [testCode, setTestCode] = useState<string>(block.props.testCode || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isViewMode = editor?.isEditable === false;
  const isEditable = block.props.editable === "true";
  const hasTests = (block.props.testCode || "").trim().length > 0;

  // Dataset loading
  const { datasets } = useDatasets();
  const datasetsLoadedRef = useRef(false);
  const pyodide = usePyodide();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync code from block props when not editing
  useEffect(() => {
    if (!isEditing) {
      setCode(block.props.code || "");
    }
  }, [block.props.code, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  const handleSave = () => {
    if (!isMounted || !editor) return;
    try {
      editor.updateBlock(block, {
        props: { ...block.props, code },
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving notebook code:", err);
    }
  };

  const handleCancelEdit = () => {
    setCode(block.props.code || "");
    setIsEditing(false);
  };

  const toggleEditable = () => {
    if (!isMounted || !editor) return;
    try {
      editor.updateBlock(block, {
        props: {
          ...block.props,
          editable: block.props.editable === "true" ? "false" : "true",
        },
      });
    } catch (err) {
      console.error("Error toggling editable:", err);
    }
  };

  const loadDatasetsIfNeeded = async () => {
    if (datasetsLoadedRef.current || datasets.length === 0) return;
    datasetsLoadedRef.current = true;
    await Promise.all(
      datasets.map((ds) =>
        pyodide.loadDataset(ds.name, ds.fileUrl).catch((err) => {
          console.warn(`Failed to load dataset "${ds.name}":`, err);
        }),
      ),
    );
  };

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      await loadDatasetsIfNeeded();
      const execResult = await pyodide.runCode(code);
      setResult(execResult);
      setExecutionCount((c) => (c === null ? 1 : c + 1));
    } catch (err: any) {
      setResult({
        stdout: "",
        stderr: err?.message ?? String(err),
        plots: [],
        error: err?.message ?? String(err),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runTests = async () => {
    if (!hasTests) return;
    setIsTestRunning(true);
    setTestResults(null);

    try {
      // First run the student's code to populate the namespace
      await loadDatasetsIfNeeded();
      await pyodide.runCode(code);

      // Run the entire test block, catching each assertion individually
      // by compiling and running the full block (supports multi-line code)
      const testWrapper = `
import json as _json
_test_results = []
try:
    exec(${JSON.stringify(block.props.testCode)})
    _test_results.append({"passed": True, "message": "All tests passed"})
except AssertionError as _e:
    _test_results.append({"passed": False, "message": f"FAIL: {_e}"})
except Exception as _e:
    _test_results.append({"passed": False, "message": f"ERROR: {type(_e).__name__}: {_e}"})
print("__TEST_RESULTS__" + _json.dumps(_test_results))
`;
      const testResult = await pyodide.runCode(testWrapper);

      // Parse test results from stdout
      const resultsLine = testResult.stdout
        .split("\n")
        .find((l: string) => l.startsWith("__TEST_RESULTS__"));
      if (resultsLine) {
        const parsed = JSON.parse(resultsLine.replace("__TEST_RESULTS__", ""));
        setTestResults(parsed);
      } else if (testResult.error) {
        setTestResults([{ passed: false, message: testResult.error }]);
      }
    } catch (err: any) {
      setTestResults([{ passed: false, message: err?.message ?? String(err) }]);
    } finally {
      setIsTestRunning(false);
    }
  };

  const saveTestCode = () => {
    if (!isMounted || !editor) return;
    try {
      editor.updateBlock(block, {
        props: { ...block.props, testCode },
      });
    } catch (err) {
      console.error("Error saving test code:", err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCodeAreaClick = () => {
    // In editor mode: creator can always edit (toggling the editable prop just affects students).
    // In view mode: only if editable===true
    if (isViewMode) {
      if (isEditable) setIsEditing(true);
    } else {
      setIsEditing(true);
    }
  };

  if (!isMounted) {
    return (
      <div className="group my-2 flex w-full items-stretch rounded-xl border border-slate-200 bg-white">
        <div className="flex w-10 flex-shrink-0 items-start justify-center pt-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="flex-1 animate-pulse p-3">
          <div className="mb-2 h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  const hasOutput =
    result &&
    (result.stdout || result.stderr || result.plots.length > 0 || result.error);

  return (
    <div
      ref={cellRef}
      className={cn(
        "group my-2 w-full overflow-hidden rounded-xl border transition-shadow",
        "bg-white dark:bg-gray-900",
        isRunning
          ? "border-blue-300 shadow-sm dark:border-blue-500/50 dark:shadow-blue-500/10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600",
      )}
      contentEditable={false}
      onMouseDown={handleMouseDown}
    >
      {/* Cell row: gutter + code area */}
      <div className="flex items-stretch">
        {/* Left gutter — play button */}
        <div className="flex w-11 flex-shrink-0 items-start justify-center pt-2.5 pb-2">
          <button
            onClick={runCode}
            disabled={isRunning}
            title="Run cell"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
              isRunning
                ? "border-blue-400 bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                : "border-slate-300 bg-white text-slate-400 hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-green-900/30 dark:hover:text-green-400",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {isRunning ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} className="ml-0.5" />
            )}
          </button>
          {executionCount !== null && (
            <span className="mt-1 block text-center text-[10px] text-slate-400 dark:text-gray-500">
              [{executionCount}]
            </span>
          )}
        </div>

        {/* Code area */}
        <div className="min-w-0 flex-1 border-l border-slate-100 dark:border-gray-700/50">
          {isEditing ? (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  // Tab indentation
                  if (e.key === "Tab") {
                    e.preventDefault();
                    e.stopPropagation();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const val = ta.value;

                    if (e.shiftKey) {
                      const before = val.substring(0, start);
                      const lines = before.split("\n");
                      const currentLine = lines[lines.length - 1];
                      if (currentLine.startsWith("    ")) {
                        const newVal =
                          val.substring(0, start - 4) + val.substring(start);
                        setCode(newVal);
                        setTimeout(() => {
                          ta.selectionStart = start - 4;
                          ta.selectionEnd = start - 4;
                        }, 0);
                      } else if (currentLine.startsWith("\t")) {
                        const newVal =
                          val.substring(0, start - 1) + val.substring(start);
                        setCode(newVal);
                        setTimeout(() => {
                          ta.selectionStart = start - 1;
                          ta.selectionEnd = start - 1;
                        }, 0);
                      }
                    } else {
                      const newVal =
                        val.substring(0, start) + "    " + val.substring(end);
                      setCode(newVal);
                      setTimeout(() => {
                        ta.selectionStart = start + 4;
                        ta.selectionEnd = start + 4;
                      }, 0);
                    }
                  }
                  // Escape exits editing in creator mode
                  if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
                onBlur={() => {
                  // Auto-save on blur for creator; in view mode just exit editing
                  if (!isViewMode) {
                    handleSave();
                  } else {
                    setIsEditing(false);
                  }
                }}
                onFocus={(e) => e.stopPropagation()}
                className="w-full resize-none bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none dark:bg-gray-800 dark:text-gray-100"
                rows={Math.max(3, code.split("\n").length)}
                style={{ minHeight: "64px" }}
                spellCheck={false}
                autoFocus
              />
            </div>
          ) : (
            <div
              className={cn(
                "relative",
                (isEditable || !isViewMode) && "cursor-text",
              )}
              onClick={handleCodeAreaClick}
            >
              <SyntaxHighlighter
                language="python"
                style={isDark ? atomOneDark : githubGist}
                customStyle={{
                  margin: 0,
                  padding: "12px",
                  background: "transparent",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
                PreTag="div"
              >
                {code || "# Write your Python code here"}
              </SyntaxHighlighter>
              {(isEditable || !isViewMode) && (
                <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-slate-400 shadow-sm dark:bg-gray-800/90 dark:text-gray-400">
                    Click to edit
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Creator toolbar — right side */}
        {!isViewMode && (
          <div className="flex flex-shrink-0 items-start px-2 pt-2">
            <button
              onClick={toggleEditable}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                isEditable
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700",
              )}
            >
              {isEditable ? <Edit size={11} /> : <Lock size={11} />}
              {isEditable ? "Editable" : "View only"}
            </button>
          </div>
        )}
      </div>

      {/* Output area */}
      {hasOutput && (
        <div className="border-t border-slate-100 bg-white dark:border-gray-700 dark:bg-gray-950">
          {/* Text output */}
          {result.stdout && !result.error && (
            <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-green-400">
              {result.stdout}
            </pre>
          )}

          {/* Error output */}
          {result.error && (
            <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-red-600 dark:text-red-400">
              {result.stderr || result.error}
            </pre>
          )}

          {/* Plot outputs */}
          {result.plots.length > 0 && (
            <div className="flex flex-col items-center gap-3 px-3 py-3">
              {result.plots.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Plot ${i + 1}`}
                  className="max-w-full rounded"
                  style={{ maxHeight: "480px" }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test cases section */}
      {hasTests && (
        <div className="border-t border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <button
              onClick={runTests}
              disabled={isTestRunning || pyodide.status === "loading"}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                isTestRunning
                  ? "bg-slate-100 text-slate-400 dark:bg-gray-800 dark:text-gray-500"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50",
              )}
            >
              {isTestRunning ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FlaskConical size={12} />
              )}
              Run Tests
            </button>
            {testResults && (
              <span className="text-xs text-slate-500 dark:text-gray-400">
                {testResults.filter((t) => t.passed).length}/
                {testResults.length} passed
              </span>
            )}
          </div>
          {testResults && (
            <div className="space-y-0.5 px-3 pb-2">
              {testResults.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-1.5 rounded px-2 py-1 font-mono text-xs",
                    t.passed
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                  )}
                >
                  {t.passed ? (
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={13} className="mt-0.5 shrink-0" />
                  )}
                  <span className="break-all">{t.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Creator: test code editor */}
      {!isViewMode && (
        <div className="border-t border-slate-100 dark:border-gray-700">
          <button
            onClick={() => setShowTestEditor(!showTestEditor)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <FlaskConical size={11} />
            Test Cases{" "}
            {hasTests &&
              `(${(block.props.testCode || "").split("\n").filter((l: string) => l.trim() && !l.trim().startsWith("#")).length})`}
            {showTestEditor ? (
              <ChevronUp size={11} />
            ) : (
              <ChevronDown size={11} />
            )}
          </button>
          {showTestEditor && (
            <div className="px-3 pb-2">
              <textarea
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                onBlur={saveTestCode}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder={
                  "# Write assert statements (hidden from students)\nassert len(df) > 0, 'DataFrame should not be empty'\nassert 'Survived' in df.columns, 'Missing Survived column'"
                }
                className="w-full resize-none rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-700 placeholder:text-slate-300 focus:border-emerald-300 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-600 dark:focus:border-emerald-500"
                rows={Math.max(3, testCode.split("\n").length)}
                spellCheck={false}
              />
              <p className="mt-1 text-[10px] text-slate-400 dark:text-gray-500">
                Write Python assert statements. These are hidden from students
                but run when they click &quot;Run Tests&quot;.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status bar */}
      {pyodide.status === "loading" && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:border-gray-700 dark:text-gray-500">
          <Loader2 size={10} className="animate-spin" />
          Initializing Python runtime...
        </div>
      )}
      {pyodide.status === "error" && (
        <div className="border-t border-red-100 px-3 py-1.5 text-[11px] text-red-500 dark:border-red-900/50 dark:text-red-400">
          Python runtime failed to load. Check your network connection.
        </div>
      )}
    </div>
  );
};

// Error boundary
class NotebookCodeBlockErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NotebookCodeBlock Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-2 w-full rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            Notebook code block failed to load. Try refreshing the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const NotebookCodeBlock = createReactBlockSpec(
  {
    type: "notebook-code" as const,
    propSchema: {
      code: {
        default: "",
      },
      language: {
        default: "python",
      },
      editable: {
        default: "true",
      },
      testCode: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => (
      <NotebookCodeBlockErrorBoundary>
        <NotebookCodeBlockComponent {...props} />
      </NotebookCodeBlockErrorBoundary>
    ),
  },
);
