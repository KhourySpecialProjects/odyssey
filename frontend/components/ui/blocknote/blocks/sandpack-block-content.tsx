"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useState, useEffect, useRef } from "react";
import React from "react";
import {
  Edit,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  PanelLeft,
  Maximize2,
  Minimize2,
  Plus,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SandpackTemplate = "vanilla" | "react" | "react-ts";

export const TEMPLATE_DEFAULTS: Record<
  SandpackTemplate,
  Record<string, string>
> = {
  vanilla: {
    "/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Live Sandbox</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <h1>Hello, World!</h1>
    <div id="app"></div>
    <script src="/index.js"></script>
  </body>
</html>`,
    "/index.js": `const app = document.getElementById('app');

app.innerHTML = '<p>Edit this code and see the changes in real time!</p>';

// Try adding more elements:
// const btn = document.createElement('button');
// btn.textContent = 'Click me';
// btn.addEventListener('click', () => alert('Clicked!'));
// app.appendChild(btn);
`,
    "/styles.css": `body {
  font-family: sans-serif;
  margin: 20px;
  color: #333;
}

h1 {
  color: #0070f3;
}

#app {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #eaeaea;
  border-radius: 8px;
}
`,
  },
  react: {
    "/App.js": `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>
      <h1>Hello from React!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
`,
    "/index.js": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
`,
  },
  "react-ts": {
    "/App.tsx": `import { useState } from "react";

interface CounterProps {
  initialCount?: number;
}

export default function App({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState<number>(initialCount);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px" }}>
      <h1>Hello from React + TypeScript!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}
`,
    "/index.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
`,
  },
};

export const TEMPLATE_LABELS: Record<SandpackTemplate, string> = {
  vanilla: "Vanilla JS",
  react: "React",
  "react-ts": "React + TypeScript",
};

const MAX_FILES = 20;
const BUBBLE_EVENTS = [
  "keydown",
  "keypress",
  "keyup",
  "input",
  "paste",
  "cut",
] as const;
const MAX_FILENAME_LENGTH = 50;
const VALID_FILENAME_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._\-/]*\.[a-zA-Z0-9]+$/;

export function validateSandpackFilename(
  filename: string,
  existingFiles: Record<string, string>,
): string | null {
  if (!filename || filename.trim().length === 0) return "Filename is required";
  if (filename.length > MAX_FILENAME_LENGTH)
    return `Max ${MAX_FILENAME_LENGTH} characters`;
  if (!filename.startsWith("/")) return "Must start with /";
  if (filename.includes("..")) return "Cannot contain consecutive dots";
  if (filename.includes("//")) return "Cannot contain consecutive slashes";
  if (!VALID_FILENAME_PATTERN.test(filename))
    return "Only letters, numbers, dots, hyphens, underscores, and slashes allowed";
  if (filename in existingFiles) return "File already exists";
  return null;
}

interface FileChangeListenerProps {
  onFilesChange: (files: Record<string, string>) => void;
}

function FileChangeListener({ onFilesChange }: FileChangeListenerProps) {
  const { sandpack } = useSandpack();
  // Keep a ref so the effect always calls the latest callback without
  // needing it in the dependency array (avoids re-running on every render).
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;

  useEffect(() => {
    const simplified: Record<string, string> = {};
    Object.entries(sandpack.files).forEach(([filename, fileObj]) => {
      simplified[filename] = fileObj.code;
    });
    onFilesChangeRef.current(simplified);
  }, [sandpack.files]);

  return null;
}

// Null-rendering component inside SandpackProvider that exposes sandpack.addFile
// via a ref so the title bar (outside the provider) can trigger file creation.
interface SandpackFileCommandsProps {
  addFileCommandRef: React.MutableRefObject<
    ((filename: string) => void) | null
  >;
}

function SandpackFileCommands({
  addFileCommandRef,
}: SandpackFileCommandsProps) {
  const { sandpack } = useSandpack();
  addFileCommandRef.current = (filename: string) => {
    sandpack.addFile(filename, "");
    sandpack.setActiveFile(filename);
  };
  return null;
}

interface CustomFileExplorerProps {
  height: string;
  isAuthorMode: boolean;
}

function CustomFileExplorer({ height, isAuthorMode }: CustomFileExplorerProps) {
  const { sandpack } = useSandpack();
  const filePaths = Object.keys(sandpack.files).sort();
  const fileCount = filePaths.length;

  const handleDelete = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete ${path}?`);
    if (!confirmed) return;
    sandpack.deleteFile(path);
  };

  return (
    <div
      style={{ height, minWidth: "160px", maxWidth: "200px" }}
      role="listbox"
      aria-label="Files"
      className="overflow-y-auto border-r border-[#333] bg-[#1e1e1e]"
    >
      {filePaths.map((path) => {
        const isActive = sandpack.activeFile === path;
        const displayPath = path.slice(1); // strip leading slash
        return (
          <div
            key={path}
            role="option"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => sandpack.setActiveFile(path)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                sandpack.setActiveFile(path);
              }
            }}
            className={`group flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#0078d4] focus:outline-none ${
              isActive
                ? "bg-[#2d2d2d] text-white"
                : "text-gray-400 hover:bg-[#252525] hover:text-white"
            }`}
          >
            <span className="truncate" title={path}>
              {displayPath}
            </span>
            {isAuthorMode && (
              <button
                onClick={(e) => handleDelete(path, e)}
                disabled={fileCount <= 1}
                className="ml-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#555] focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
                title={
                  fileCount <= 1
                    ? "Cannot delete the last file"
                    : `Delete ${path}`
                }
                data-testid={`delete-file-button-${path}`}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SandpackBlockInnerProps {
  template: SandpackTemplate;
  files: Record<string, string>;
  showPreview: boolean;
  showFileExplorer: boolean;
  editable: boolean;
  isAuthorMode: boolean;
  resolvedTheme: string | undefined;
  onFilesChange?: (files: Record<string, string>) => void;
  addFileCommandRef?: React.MutableRefObject<
    ((filename: string) => void) | null
  >;
  fullscreen?: boolean;
}

function SandpackBlockInner({
  template,
  files,
  showPreview,
  showFileExplorer,
  editable,
  isAuthorMode,
  resolvedTheme,
  onFilesChange,
  addFileCommandRef,
  fullscreen,
}: SandpackBlockInnerProps) {
  const sandpackTheme = resolvedTheme === "dark" ? "dark" : "light";
  const hasCustomFiles = Object.keys(files).length > 0;
  const sandpackFiles = hasCustomFiles ? files : undefined;
  const panelHeight = fullscreen ? "calc(100vh - 37px)" : "560px";

  return (
    <SandpackProvider
      template={template}
      files={sandpackFiles}
      theme={sandpackTheme}
      options={{ recompileMode: "delayed", recompileDelay: 500 }}
    >
      {isAuthorMode && onFilesChange && (
        <FileChangeListener onFilesChange={onFilesChange} />
      )}
      {isAuthorMode && addFileCommandRef && (
        <SandpackFileCommands addFileCommandRef={addFileCommandRef} />
      )}
      <SandpackLayout>
        {showFileExplorer && (
          <CustomFileExplorer
            height={panelHeight}
            isAuthorMode={isAuthorMode}
          />
        )}
        <SandpackCodeEditor
          readOnly={!editable && !isAuthorMode}
          showLineNumbers
          showTabs={false}
          showInlineErrors
          style={{ height: panelHeight, flex: 1 }}
        />
        {showPreview && (
          <SandpackPreview
            style={{ height: panelHeight, flex: 1 }}
            showNavigator
          />
        )}
      </SandpackLayout>
    </SandpackProvider>
  );
}

export interface SandpackBlockContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  block: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}

export function SandpackBlockContent({
  block,
  editor,
}: SandpackBlockContentProps) {
  const { resolvedTheme } = useTheme();
  const isAuthorMode = editor?.isEditable !== false;
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addFileOpen, setAddFileOpen] = useState(false);
  const [newFilename, setNewFilename] = useState("/");
  const [addFileError, setAddFileError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const addFilePopoverRef = useRef<HTMLDivElement>(null);
  const addFileCommandRef = useRef<((filename: string) => void) | null>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Clear debounce timer on unmount to avoid firing updateBlock on a dead editor.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Stop keyboard/input/paste events from bubbling out to ProseMirror.
  // ProseMirror registers native DOM listeners that fire before React synthetic
  // events, so we must intercept at the native level to prevent keystrokes
  // typed inside CodeMirror from leaking into the lesson editor.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    BUBBLE_EVENTS.forEach((evt) => el.addEventListener(evt, stop));
    return () =>
      BUBBLE_EVENTS.forEach((evt) => el.removeEventListener(evt, stop));
  }, []);

  // Same event isolation for the fullscreen overlay — uses a ref+effect so
  // listeners are properly cleaned up each time the overlay mounts/unmounts.
  useEffect(() => {
    const el = fullscreenRef.current;
    if (!isFullscreen || !el) return;
    const stop = (e: Event) => e.stopPropagation();
    BUBBLE_EVENTS.forEach((evt) => el.addEventListener(evt, stop));
    return () =>
      BUBBLE_EVENTS.forEach((evt) => el.removeEventListener(evt, stop));
  }, [isFullscreen]);

  const closeAddFilePopover = () => {
    setAddFileOpen(false);
    setNewFilename("/");
    setAddFileError(null);
  };

  useEffect(() => {
    if (!addFileOpen) return;
    addFileInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAddFilePopover();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (
        addFilePopoverRef.current &&
        !addFilePopoverRef.current.contains(e.target as Node)
      ) {
        closeAddFilePopover();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [addFileOpen]);

  const handleAddFileCreate = () => {
    const validationError = validateSandpackFilename(newFilename, parsedFiles);
    if (validationError) {
      setAddFileError(validationError);
      return;
    }
    addFileCommandRef.current?.(newFilename);
    setShowFileExplorer(true);
    closeAddFilePopover();
  };

  const currentTemplate = (block.props.template ||
    "vanilla") as SandpackTemplate;
  const currentShowPreview =
    block.props.showPreview !== false && block.props.showPreview !== "false";
  const currentEditable =
    block.props.editable !== false && block.props.editable !== "false";

  const parsedFiles = React.useMemo(() => {
    try {
      const parsed = JSON.parse(block.props.files || "{}");
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }, [block.props.files]);
  const fileCount = Object.keys(parsedFiles).length;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const toggleShowPreview = () => {
    if (!editor) return;
    try {
      editor.updateBlock(block, {
        props: { ...block.props, showPreview: !currentShowPreview },
      });
    } catch (error) {
      console.error("Error toggling preview:", error);
    }
  };

  const toggleEditable = () => {
    if (!editor) return;
    try {
      editor.updateBlock(block, {
        props: { ...block.props, editable: !currentEditable },
      });
    } catch (error) {
      console.error("Error toggling editable:", error);
    }
  };

  const changeTemplate = (newTemplate: SandpackTemplate) => {
    if (!editor) return;

    const hasCustomFiles = Object.keys(parsedFiles).length > 0;
    const currentDefaults = TEMPLATE_DEFAULTS[currentTemplate];
    const isDefaultFiles =
      !hasCustomFiles ||
      JSON.stringify(parsedFiles) === JSON.stringify(currentDefaults);

    if (!isDefaultFiles) {
      const confirmed = window.confirm(
        "Switching templates will reset your code. Continue?",
      );
      if (!confirmed) return;
    }

    try {
      editor.updateBlock(block, {
        props: {
          ...block.props,
          template: newTemplate,
          files: JSON.stringify(TEMPLATE_DEFAULTS[newTemplate]),
        },
      });
    } catch (error) {
      console.error("Error changing template:", error);
    }
  };

  const resetToDefaults = () => {
    if (!editor) return;
    const confirmed = window.confirm(
      "Reset code to template defaults? This will discard your changes.",
    );
    if (!confirmed) return;
    try {
      editor.updateBlock(block, {
        props: {
          ...block.props,
          files: JSON.stringify(TEMPLATE_DEFAULTS[currentTemplate]),
        },
      });
    } catch (error) {
      console.error("Error resetting to defaults:", error);
    }
  };

  const handleFilesChange = (newFiles: Record<string, string>) => {
    if (!editor) return;
    const newFilesJson = JSON.stringify(newFiles);
    if (newFilesJson === block.props.files) return;

    // Debounce saves: cancel the previous pending update and schedule a new one.
    // Firing updateBlock on every keystroke queues rapid ProseMirror transactions
    // that can step on each other and produce "Position X out of range" errors.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const currentBlock = block;
    const currentEditor = editor;
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      try {
        currentEditor.updateBlock(currentBlock, {
          props: { ...currentBlock.props, files: newFilesJson },
        });
      } catch {
        // Ignore stale-reference errors if the block was removed
      }
    }, 600);
  };

  const titleBar = (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center justify-between border-b border-[#333] bg-[#2d2d2d] px-3 py-2">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowFileExplorer((v) => !v)}
                className={`rounded p-1 transition-colors ${
                  showFileExplorer
                    ? "bg-[#3e3e3e] text-white"
                    : "text-white hover:bg-[#3e3e3e]"
                }`}
                data-testid="file-explorer-toggle"
              >
                <PanelLeft size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {showFileExplorer ? "Hide file explorer" : "Show file explorer"}
            </TooltipContent>
          </Tooltip>

          {isAuthorMode && (
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (fileCount < MAX_FILES) {
                        setAddFileOpen((v) => !v);
                        setNewFilename("/");
                        setAddFileError(null);
                      }
                    }}
                    disabled={fileCount >= MAX_FILES}
                    className="rounded p-1 text-white transition-colors hover:bg-[#3e3e3e] disabled:cursor-not-allowed disabled:opacity-40"
                    data-testid="add-file-button"
                  >
                    <Plus size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {fileCount >= MAX_FILES
                    ? `Maximum ${MAX_FILES} files reached`
                    : "Add file"}
                </TooltipContent>
              </Tooltip>

              {addFileOpen && (
                <div
                  ref={addFilePopoverRef}
                  role="dialog"
                  aria-label="Add new file"
                  className="absolute top-full left-0 z-50 mt-1 w-64 rounded border border-[#555] bg-[#2d2d2d] p-3 shadow-lg"
                >
                  <input
                    ref={addFileInputRef}
                    type="text"
                    aria-label="New filename"
                    value={newFilename}
                    onChange={(e) => {
                      setNewFilename(e.target.value);
                      setAddFileError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddFileCreate();
                    }}
                    placeholder="/filename.js"
                    className="w-full rounded border border-[#555] bg-[#1e1e1e] px-2 py-1 text-sm text-white outline-none focus:border-[#0078d4]"
                    data-testid="new-filename-input"
                  />
                  {addFileError && (
                    <p
                      className="mt-1 text-xs text-red-400"
                      data-testid="filename-error"
                    >
                      {addFileError}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleAddFileCreate}
                      className="rounded bg-[#0078d4] px-2 py-1 text-xs text-white hover:bg-[#106ebe]"
                    >
                      Create
                    </button>
                    <button
                      onClick={closeAddFilePopover}
                      className="rounded px-2 py-1 text-xs text-white hover:bg-[#3e3e3e]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAuthorMode ? (
            <div
              className="flex items-center gap-0.5"
              data-testid="template-selector"
            >
              {(Object.keys(TEMPLATE_LABELS) as SandpackTemplate[]).map(
                (tmpl) => (
                  <Tooltip key={tmpl}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => changeTemplate(tmpl)}
                        className={`rounded px-2 py-0.5 text-xs transition-colors ${
                          currentTemplate === tmpl
                            ? "bg-[#0078d4] text-white"
                            : "text-white hover:bg-[#3e3e3e]"
                        }`}
                      >
                        {TEMPLATE_LABELS[tmpl]}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Switch to {TEMPLATE_LABELS[tmpl]}
                    </TooltipContent>
                  </Tooltip>
                ),
              )}
            </div>
          ) : (
            <span className="text-xs text-white">
              {TEMPLATE_LABELS[currentTemplate]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isAuthorMode && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={resetToDefaults}
                    className="rounded p-1.5 text-white transition-colors hover:bg-[#3e3e3e]"
                    data-testid="reset-button"
                  >
                    <RotateCcw size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Reset to template defaults</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleEditable}
                    className="rounded p-1.5 text-white transition-colors hover:bg-[#3e3e3e]"
                    data-testid="editable-toggle"
                  >
                    {currentEditable ? <Edit size={13} /> : <Lock size={13} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {currentEditable
                    ? "Students can edit — click to lock"
                    : "Read-only for students — click to unlock"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleShowPreview}
                    className="rounded p-1.5 text-white transition-colors hover:bg-[#3e3e3e]"
                    data-testid="preview-toggle"
                  >
                    {currentShowPreview ? (
                      <Eye size={13} />
                    ) : (
                      <EyeOff size={13} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {currentShowPreview ? "Hide preview" : "Show preview"}
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsFullscreen((v) => !v)}
                className="rounded p-1.5 text-gray-300 transition-colors hover:bg-[#3e3e3e] hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 size={13} />
                ) : (
                  <Maximize2 size={13} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );

  const sandpackInner = (
    <SandpackBlockInner
      template={currentTemplate}
      files={parsedFiles}
      showPreview={currentShowPreview}
      showFileExplorer={showFileExplorer}
      editable={currentEditable}
      isAuthorMode={isAuthorMode}
      resolvedTheme={resolvedTheme}
      onFilesChange={isAuthorMode ? handleFilesChange : undefined}
      addFileCommandRef={isAuthorMode ? addFileCommandRef : undefined}
      fullscreen={isFullscreen}
    />
  );

  return (
    <>
      <div
        ref={containerRef}
        className="my-4 w-full overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]"
        contentEditable={false}
        onMouseDown={handleMouseDown}
      >
        {titleBar}
        {!isFullscreen && sandpackInner}
      </div>

      {isFullscreen && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e]"
          onMouseDown={handleMouseDown}
        >
          {titleBar}
          {sandpackInner}
        </div>
      )}
    </>
  );
}
