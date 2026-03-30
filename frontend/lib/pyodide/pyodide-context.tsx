"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  initPyodide,
  runPython,
  loadDatasetFile,
  resetNamespace,
  type ExecutionResult,
} from "./runtime";

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

export interface PyodideContextValue {
  status: PyodideStatus;
  runCode: (code: string) => Promise<ExecutionResult>;
  loadDataset: (name: string, url: string) => Promise<void>;
  initIfNeeded: () => Promise<void>;
  executionCounter: number;
}

const PyodideContext = createContext<PyodideContextValue | null>(null);

export function PyodideProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PyodideStatus>("idle");
  const [executionCounter, setExecutionCounter] = useState(0);
  const loadedDatasets = useRef<Set<string>>(new Set());

  const initIfNeeded = useCallback(async () => {
    if (status === "ready" || status === "loading") return;
    setStatus("loading");
    try {
      await initPyodide();
      setStatus("ready");
    } catch (err) {
      console.error("Pyodide init failed:", err);
      setStatus("error");
    }
  }, [status]);

  const runCode = useCallback(
    async (code: string): Promise<ExecutionResult> => {
      // Always ensure Pyodide is initialized (initPyodide is idempotent)
      setStatus("loading");
      await initPyodide();
      setStatus("ready");
      const result = await runPython(code);
      setExecutionCounter((c) => c + 1);
      return result;
    },
    [],
  );

  const loadDataset = useCallback(
    async (name: string, url: string): Promise<void> => {
      if (loadedDatasets.current.has(name)) return;

      // Always ensure Pyodide is initialized (initPyodide is idempotent)
      await initPyodide();

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch dataset "${name}": ${response.status}`,
        );
      }
      const buffer = await response.arrayBuffer();
      await loadDatasetFile(name, buffer);
      loadedDatasets.current.add(name);
    },
    [],
  );

  return (
    <PyodideContext.Provider
      value={{ status, runCode, loadDataset, initIfNeeded, executionCounter }}
    >
      {children}
    </PyodideContext.Provider>
  );
}

const defaultValue: PyodideContextValue = {
  status: "idle",
  runCode: async () => ({
    stdout: "",
    stderr: "",
    plots: [],
    error: "PyodideProvider not mounted",
  }),
  loadDataset: async () => {},
  initIfNeeded: async () => {},
  executionCounter: 0,
};

export function usePyodide(): PyodideContextValue {
  return useContext(PyodideContext) ?? defaultValue;
}
