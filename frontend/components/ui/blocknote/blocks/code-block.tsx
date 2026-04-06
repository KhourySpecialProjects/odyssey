"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useState, useEffect, ErrorInfo } from "react";
import React from "react";
import { Play, Edit, Lock, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { CodeEditor } from "@/components/ui/code-editor";

// Piston API configuration - calling directly
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

// Languages supported by both Piston and CodeMirror
const SUPPORTED_LANGUAGES = {
  Web: [
    {
      value: "javascript",
      label: "JavaScript",
      pistonName: "javascript",
      fileName: "index.js",
    },
    {
      value: "typescript",
      label: "TypeScript",
      pistonName: "typescript",
      fileName: "index.ts",
    },
  ],
  Popular: [
    {
      value: "python",
      label: "Python",
      pistonName: "python",
      fileName: "main.py",
    },
    { value: "java", label: "Java", pistonName: "java", fileName: "Main.java" },
    { value: "cpp", label: "C++", pistonName: "c++", fileName: "main.cpp" },
    { value: "c", label: "C", pistonName: "c", fileName: "main.c" },
    { value: "csharp", label: "C#", pistonName: "csharp", fileName: "Main.cs" },
  ],
  Scripting: [
    { value: "php", label: "PHP", pistonName: "php", fileName: "index.php" },
    { value: "ruby", label: "Ruby", pistonName: "ruby", fileName: "main.rb" },
    { value: "bash", label: "Bash", pistonName: "bash", fileName: "script.sh" },
  ],
  Modern: [
    { value: "go", label: "Go", pistonName: "go", fileName: "main.go" },
    { value: "rust", label: "Rust", pistonName: "rust", fileName: "main.rs" },
    {
      value: "kotlin",
      label: "Kotlin",
      pistonName: "kotlin",
      fileName: "Main.kt",
    },
    {
      value: "swift",
      label: "Swift",
      pistonName: "swift",
      fileName: "main.swift",
    },
  ],
  Other: [
    { value: "json", label: "JSON", pistonName: "", fileName: "data.json" },
    {
      value: "plaintext",
      label: "Plain Text",
      pistonName: "",
      fileName: "file.txt",
    },
  ],
};

const allLanguages = Object.values(SUPPORTED_LANGUAGES).flat();

const executePistonCode = async (language: string, code: string) => {
  const langConfig = allLanguages.find((l) => l.value === language);
  if (!langConfig || !langConfig.pistonName) {
    return {
      success: false,
      output: `Language ${language} is not supported for execution`,
    };
  }

  try {
    const response = await fetch(PISTON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: langConfig.pistonName,
        version: "*",
        files: [
          {
            name: langConfig.fileName,
            content: code,
          },
        ],
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

    // Handle compilation errors
    if (result.compile && result.compile.code !== 0) {
      return {
        success: false,
        output:
          result.compile.stderr ||
          result.compile.output ||
          "Compilation failed",
      };
    }

    // Handle runtime errors
    if (result.run.code !== 0 && result.run.stderr) {
      return {
        success: false,
        output: result.run.stderr,
      };
    }

    // Return successful output
    const output =
      result.run.stdout ||
      result.run.output ||
      "Code executed successfully (no output)";
    return {
      success: true,
      output: output.trim(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      success: false,
      output: `Execution error: ${error.message}`,
    };
  }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeBlockComponent = ({ block, editor }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(block.props.code);
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const currentLanguage = allLanguages.find(
    (lang) => lang.value === block.props.language,
  );

  // Check if editor is in view mode (read-only)
  // Use optional chaining and default to false (edit mode)
  const isViewMode = editor?.isEditable === false;

  // Wait for component to mount before rendering interactive elements
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync code state with block props (important for previewing mode)
  useEffect(() => {
    // Update local code state when block props change
    if (block.props.code !== code && !isEditing) {
      setCode(block.props.code);
    }
  }, [block.props.code, isEditing]);

  const handleSave = () => {
    if (!isMounted || !editor) return;
    try {
      // Check if editor is editable, but still try to update even in view mode
      // The editor might allow updates even if isEditable is false
      editor.updateBlock(block, {
        props: { ...block.props, code },
      });
      setIsEditing(false);

      // If updateBlock doesn't work in view mode, we might need to trigger onChange
      // But first, let's make sure the update actually happened
      // The onChange handler in the parent should handle saving to Strapi
    } catch (error) {
      console.error("Error saving code:", error);
      // Don't exit editing mode if save failed - let user try again
      // setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCode(block.props.code);
    setIsEditing(false);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");
    setExecutionSuccess(true);

    try {
      const result = await executePistonCode(block.props.language, code);
      setOutput(result.output);
      setExecutionSuccess(result.success);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setOutput(`Unexpected error: ${error.message}`);
      setExecutionSuccess(false);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleEditable = () => {
    if (!isMounted || !editor) return;
    try {
      editor.updateBlock(block, {
        props: { ...block.props, editable: !block.props.editable },
      });
    } catch (error) {
      console.error("Error toggling editable:", error);
    }
  };

  const toggleRunnable = () => {
    if (!isMounted || !editor) return;
    try {
      editor.updateBlock(block, {
        props: { ...block.props, runnable: !block.props.runnable },
      });
    } catch (error) {
      console.error("Error toggling runnable:", error);
    }
  };

  const changeLanguage = (lang: string) => {
    if (!isMounted || !editor) return;
    try {
      const langConfig = allLanguages.find((l) => l.value === lang);
      const isExecutable = !!langConfig?.pistonName;
      editor.updateBlock(block, {
        props: {
          ...block.props,
          language: lang,
          ...(isExecutable ? {} : { runnable: false }),
        },
      });
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  // Prevent BlockNote from handling events in this component
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // If not mounted yet, show a loading state
  if (!isMounted) {
    return (
      <div className="my-4 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-700"></div>
          <div className="h-32 rounded bg-gray-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="my-4 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
      contentEditable={false}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          {isViewMode ? (
            // Student view - show language name only
            <span className="px-3 py-1.5 text-sm font-medium text-gray-200">
              {currentLanguage?.label || block.props.language}
            </span>
          ) : (
            // Creator view - show language selector
            <select
              value={block.props.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="min-w-[140px] rounded border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-200"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([category, langs]) => (
                <optgroup key={category} label={category}>
                  {langs.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <span className="flex items-center gap-1 text-xs text-green-400">
            <Play size={12} />
            Executable
          </span>
        </div>

        {!isViewMode && (
          <div className="flex items-center gap-2">
            {/* Editable Toggle */}
            <button
              onClick={toggleEditable}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                block.props.editable
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
              title={block.props.editable ? "Learners can edit" : "Read-only"}
            >
              {block.props.editable ? <Edit size={14} /> : <Lock size={14} />}
              {block.props.editable ? "Editable" : "Locked"}
            </button>

            {/* Runnable Toggle */}
            <button
              onClick={toggleRunnable}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                block.props.runnable
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
              title={block.props.runnable ? "Can run code" : "Cannot run code"}
            >
              <Play size={14} />
              {block.props.runnable ? "Runnable" : "View Only"}
            </button>
          </div>
        )}
      </div>

      {/* Code Editor/Viewer */}
      <div className="relative">
        {isEditing && block.props.editable ? (
          <div>
            <CodeEditor
              language={block.props.language}
              value={code}
              onChange={setCode}
            />
            <div className="flex gap-2 border-t border-gray-700 bg-gray-800 p-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="group relative cursor-pointer"
            onClick={() => {
              if (block.props.editable) {
                setIsEditing(true);
              }
            }}
          >
            <CodeEditor
              language={block.props.language}
              value={code}
              readOnly
              placeholder="# Write your code here"
            />
            {block.props.editable && (
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
      {block.props.runnable && (
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
};

// Error boundary to catch rendering errors
class CodeBlockErrorBoundary extends React.Component<
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
    console.error("CodeBlock Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 w-full rounded-lg border border-red-700 bg-red-50 p-4 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Code block failed to load. Try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export const CodeBlock = createReactBlockSpec(
  {
    type: "code-block",
    propSchema: {
      language: {
        default: "javascript",
      },
      code: {
        default: "",
      },
      editable: {
        default: true,
      },
      runnable: {
        default: false,
      },
    },
    content: "none",
  },
  {
    render: (props) => (
      <CodeBlockErrorBoundary>
        <CodeBlockComponent {...props} />
      </CodeBlockErrorBoundary>
    ),
  },
);
