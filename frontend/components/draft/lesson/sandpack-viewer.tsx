"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { PanelLeft, Maximize2, Minimize2 } from "lucide-react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import {
  SandpackTemplate,
  TEMPLATE_LABELS,
} from "@/components/ui/blocknote/blocks/sandpack-block-content";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SandpackViewerProps {
  template: SandpackTemplate;
  files: Record<string, string>;
  showPreview: boolean;
  editable: boolean;
  presentationMode?: boolean;
}

export function SandpackViewer({
  template,
  files,
  showPreview,
  editable,
  presentationMode = false,
}: SandpackViewerProps) {
  const { resolvedTheme } = useTheme();
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const sandpackTheme = resolvedTheme === "dark" ? "dark" : "light";

  const hasCustomFiles = Object.keys(files).length > 0;
  const sandpackFiles = hasCustomFiles ? files : undefined;

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const panelHeight =
    isFullscreen || presentationMode ? "calc(100vh - 37px)" : "560px";

  const sandpackPanel = (
    <SandpackProvider
      template={template}
      files={sandpackFiles}
      theme={sandpackTheme}
      options={{ recompileMode: "delayed", recompileDelay: 500 }}
    >
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
          readOnly={!editable}
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
              >
                <PanelLeft size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {showFileExplorer ? "Hide file explorer" : "Show file explorer"}
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-white">
            {TEMPLATE_LABELS[template]}
          </span>
        </div>
        {!presentationMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsFullscreen((v) => !v)}
                className="rounded p-1.5 text-white transition-colors hover:bg-[#3e3e3e]"
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
        )}
      </div>
    </TooltipProvider>
  );

  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-[101] flex flex-col overflow-hidden bg-[#1e1e1e]">
        {titleBar}
        {sandpackPanel}
      </div>
    );
  }

  return (
    <>
      <div className="my-4 w-full overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]">
        {titleBar}
        {!isFullscreen && sandpackPanel}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e]">
          {titleBar}
          {sandpackPanel}
        </div>
      )}
    </>
  );
}
