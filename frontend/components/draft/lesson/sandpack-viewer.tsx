"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { PanelLeft, Maximize2, Minimize2 } from "lucide-react";
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

const SandpackProvider = dynamic(
  () =>
    import("@codesandbox/sandpack-react").then((mod) => mod.SandpackProvider),
  { ssr: false },
);

const SandpackLayout = dynamic(
  () => import("@codesandbox/sandpack-react").then((mod) => mod.SandpackLayout),
  { ssr: false },
);

const SandpackCodeEditor = dynamic(
  () =>
    import("@codesandbox/sandpack-react").then((mod) => mod.SandpackCodeEditor),
  { ssr: false },
);

const SandpackPreview = dynamic(
  () =>
    import("@codesandbox/sandpack-react").then((mod) => mod.SandpackPreview),
  { ssr: false },
);

const SandpackFileExplorer = dynamic(
  () =>
    import("@codesandbox/sandpack-react").then(
      (mod) => mod.SandpackFileExplorer,
    ),
  { ssr: false },
);

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

  const sandpackPanel = (fullscreen: boolean) => {
    const panelHeight =
      fullscreen || presentationMode ? "calc(100vh - 37px)" : "560px";
    return (
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
  };

  const titleBar = (fullscreen: boolean) => (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center justify-between border-b border-[#333] bg-[#2d2d2d] px-3 py-2">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowFileExplorer((v) => !v)}
                className={`rounded p-1 transition-colors ${
                  showFileExplorer
                    ? "bg-[#3e3e3e] text-gray-200"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <PanelLeft size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {showFileExplorer ? "Hide file explorer" : "Show file explorer"}
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-gray-400">
            {TEMPLATE_LABELS[template]}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="rounded p-1.5 text-gray-300 transition-colors hover:bg-[#3e3e3e] hover:text-white"
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {fullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-[101] flex flex-col overflow-hidden bg-[#1e1e1e]">
        {titleBar(false)}
        {sandpackPanel(false)}
      </div>
    );
  }

  return (
    <>
      <div className="my-4 w-full overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]">
        {titleBar(false)}
        {sandpackPanel(false)}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e]">
          {titleBar(true)}
          {sandpackPanel(true)}
        </div>
      )}
    </>
  );
}
