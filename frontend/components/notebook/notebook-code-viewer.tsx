"use client";

import { useState, useRef } from "react";
import { CodeEditor } from "@/components/ui/code-editor";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePyodide } from "@/lib/pyodide/pyodide-context";
import { useDatasets } from "@/lib/contexts/dataset-context";
import type { ExecutionResult } from "@/lib/pyodide/runtime";

interface NotebookCodeViewerProps {
  code: string;
  language?: string;
  editable?: boolean;
  testCode?: string;
}

export function NotebookCodeViewer({
  code: initialCode,
  language = "python",
  editable = false,
  testCode = "",
}: NotebookCodeViewerProps) {
  const [code, setCode] = useState(initialCode);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [executionCount, setExecutionCount] = useState<number | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    { passed: boolean; message: string }[] | null
  >(null);
  const datasetsLoadedRef = useRef<Set<number>>(new Set());

  const { datasets } = useDatasets();
  const pyodide = usePyodide();
  const hasTests = testCode.trim().length > 0;

  const loadDatasetsIfNeeded = async () => {
    if (datasets.length === 0) return;
    const unloaded = datasets.filter(
      (ds) => !datasetsLoadedRef.current.has(ds.id),
    );
    if (unloaded.length === 0) return;
    await Promise.all(
      unloaded.map((ds) =>
        pyodide
          .loadDataset(ds.name, ds.url)
          .then(() => datasetsLoadedRef.current.add(ds.id))
          .catch((err) =>
            console.warn(`Failed to load dataset "${ds.name}":`, err),
          ),
      ),
    );
  };

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      await loadDatasetsIfNeeded();
      const execResult = await pyodide.runCode(code);
      setResult(execResult);
      setExecutionCount((c) => (c === null ? 1 : c + 1));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({ stdout: "", stderr: message, plots: [], error: message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTests = async () => {
    if (!hasTests) return;
    setIsTestRunning(true);
    setTestResults(null);
    try {
      await loadDatasetsIfNeeded();
      await pyodide.runCode(code);
      const testWrapper = `
import json as _json
_test_results = []
try:
    exec(${JSON.stringify(testCode)})
    _test_results.append({"passed": True, "message": "All tests passed"})
except AssertionError as _e:
    _test_results.append({"passed": False, "message": f"FAIL: {_e}"})
except Exception as _e:
    _test_results.append({"passed": False, "message": f"ERROR: {type(_e).__name__}: {_e}"})
print("__TEST_RESULTS__" + _json.dumps(_test_results))
`;
      const testResult = await pyodide.runCode(testWrapper);
      const resultsLine = testResult.stdout
        .split("\n")
        .find((l: string) => l.startsWith("__TEST_RESULTS__"));
      if (resultsLine) {
        try {
          setTestResults(
            JSON.parse(resultsLine.replace("__TEST_RESULTS__", "")),
          );
        } catch {
          setTestResults([{ passed: false, message: "Invalid test output" }]);
        }
      } else if (testResult.error) {
        setTestResults([{ passed: false, message: testResult.error }]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResults([{ passed: false, message }]);
    } finally {
      setIsTestRunning(false);
    }
  };

  const hasOutput =
    result &&
    (result.stdout || result.stderr || result.plots.length > 0 || result.error);

  return (
    <div
      className={cn(
        "my-2 w-full overflow-hidden rounded-xl border transition-shadow",
        "bg-white dark:bg-gray-900",
        isRunning
          ? "border-blue-300 shadow-sm dark:border-blue-500/50"
          : "border-slate-200 dark:border-gray-700",
      )}
    >
      {/* Cell: gutter + code */}
      <div className="flex items-stretch">
        {/* Play button gutter */}
        <div className="flex w-11 flex-shrink-0 items-start justify-center pt-2.5 pb-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            title="Run cell"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
              isRunning
                ? "border-blue-400 bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                : "border-slate-300 bg-white text-slate-400 hover:border-green-500 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-green-900/30 dark:hover:text-green-400",
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
          <CodeEditor
            language={language}
            value={code}
            onChange={editable ? setCode : undefined}
            readOnly={!editable}
            placeholder="# Write your Python code here"
          />
        </div>
      </div>

      {/* Output */}
      {hasOutput && (
        <div className="border-t border-slate-100 bg-white dark:border-gray-700 dark:bg-gray-950">
          {result.stdout && !result.error && (
            <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-green-400">
              {result.stdout}
            </pre>
          )}
          {result.error && (
            <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-red-600 dark:text-red-400">
              {result.stderr || result.error}
            </pre>
          )}
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

      {/* Test cases */}
      {hasTests && (
        <div className="border-t border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <button
              onClick={handleRunTests}
              disabled={isTestRunning}
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

      {/* Status */}
      {pyodide.status === "loading" && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:border-gray-700 dark:text-gray-500">
          <Loader2 size={10} className="animate-spin" />
          Initializing Python runtime...
        </div>
      )}
    </div>
  );
}
