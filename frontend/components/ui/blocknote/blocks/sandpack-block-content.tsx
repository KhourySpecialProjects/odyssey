"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useState, useEffect } from "react";
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

interface FileChangeListenerProps {
  onFilesChange: (files: Record<string, string>) => void;
}

function FileChangeListener({ onFilesChange }: FileChangeListenerProps) {
  const { sandpack } = useSandpack();

  useEffect(() => {
    const files = sandpack.files;
    const simplified: Record<string, string> = {};
    Object.entries(files).forEach(([filename, fileObj]) => {
      simplified[filename] = fileObj.code;
    });
    onFilesChange(simplified);
  }, [sandpack.files]);

  return null;
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
      <SandpackLayout>
        {showFileExplorer && (
          <SandpackFileExplorer
            style={{
              height: panelHeight,
              minWidth: "160px",
              maxWidth: "200px",
            }}
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

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

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
    // Defer to avoid flushSync conflict with BlockNote's editor.updateBlock
    // (BlockNote calls flushSync internally, which crashes inside a React lifecycle).
    const currentBlock = block;
    const currentEditor = editor;
    setTimeout(() => {
      try {
        currentEditor.updateBlock(currentBlock, {
          props: { ...currentBlock.props, files: newFilesJson },
        });
      } catch {
        // Ignore update errors during rapid typing
      }
    }, 0);
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
      fullscreen={isFullscreen}
    />
  );

  return (
    <>
      <div
        className="my-4 w-full overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]"
        contentEditable={false}
        onMouseDown={handleMouseDown}
      >
        {titleBar}
        {!isFullscreen && sandpackInner}
      </div>

      {isFullscreen && (
        <div
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
