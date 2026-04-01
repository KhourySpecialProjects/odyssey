"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { PanelLeft, Maximize2, Minimize2, Plus, BookOpen } from "lucide-react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import {
  SandpackTemplate,
  TEMPLATE_LABELS,
  CustomFileExplorer,
  ReadOnlySandpackEditor,
  validateSandpackFilename,
  MAX_FILES,
} from "@/components/ui/blocknote/blocks/sandpack-block-content";

const TEMPLATE_DOCS: Record<SandpackTemplate, string> = {
  vanilla: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  react: "https://react.dev",
  "react-ts": "https://www.typescriptlang.org/docs/",
};
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
  /** Author-written task instructions shown above the editor */
  description?: string;
  /** JSON string or string array of file paths the author locked read-only */
  lockedFiles?: string | string[];
  presentationMode?: boolean;
}

interface ViewerContentProps {
  template: SandpackTemplate;
  showPreview: boolean;
  editable: boolean;
  authorLockedFiles: string[];
  presentationMode: boolean;
}

function ViewerContent({
  template,
  showPreview,
  editable,
  authorLockedFiles,
  presentationMode,
}: ViewerContentProps) {
  const { sandpack } = useSandpack();
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addFileOpen, setAddFileOpen] = useState(false);
  const [newFilename, setNewFilename] = useState("/");
  const [addFileError, setAddFileError] = useState<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const addFilePopoverRef = useRef<HTMLDivElement>(null);

  const fileCount = Object.keys(sandpack.files).length;

  const currentFiles = useMemo(() => {
    const result: Record<string, string> = {};
    Object.entries(sandpack.files).forEach(([path, f]) => {
      result[path] = f.code;
    });
    return result;
  }, [sandpack.files]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    const error = validateSandpackFilename(newFilename, currentFiles);
    if (error) {
      setAddFileError(error);
      return;
    }
    sandpack.addFile(newFilename, "");
    sandpack.setActiveFile(newFilename);
    setShowFileExplorer(true);
    closeAddFilePopover();
  };

  const panelHeight =
    isFullscreen || presentationMode ? "calc(100vh - 37px)" : "560px";

  const titleBar = (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowFileExplorer((v) => !v)}
                className={`rounded p-1 transition-colors ${
                  showFileExplorer
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <PanelLeft size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {showFileExplorer ? "Hide file explorer" : "Show file explorer"}
            </TooltipContent>
          </Tooltip>

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
                  className="rounded p-1 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="absolute top-full left-0 z-50 mt-1 w-64 rounded border border-gray-200 bg-white p-3 shadow-lg"
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
                  className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-900 outline-none focus:border-[#0078d4]"
                />
                {addFileError && (
                  <p className="mt-1 text-xs text-red-400">{addFileError}</p>
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
                    className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-xs text-gray-700">
            {TEMPLATE_LABELS[template]}
          </span>

          {/* Docs link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={TEMPLATE_DOCS[template]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 text-gray-700 transition-colors hover:bg-gray-100"
                aria-label="Open documentation"
              >
                <BookOpen size={13} />
              </a>
            </TooltipTrigger>
            <TooltipContent>Open documentation</TooltipContent>
          </Tooltip>
        </div>

        {!presentationMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsFullscreen((v) => !v)}
                className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100"
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

  const sandpackLayout = (
    <SandpackLayout>
      {showFileExplorer && (
        <CustomFileExplorer
          height={panelHeight}
          canDelete={true}
          lockedFiles={authorLockedFiles}
          // No onToggleLock — author locks are static read-only indicators for students
        />
      )}
      <ReadOnlySandpackEditor
        lockedFiles={authorLockedFiles}
        globalReadOnly={!editable}
        height={panelHeight}
      />
      {showPreview && (
        <SandpackPreview
          style={{ height: panelHeight, flex: 1 }}
          showOpenInCodeSandbox={false}
        />
      )}
    </SandpackLayout>
  );

  const fullscreenPortal = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#1e1e1e]">
      {titleBar}
      {sandpackLayout}
    </div>
  );

  if (presentationMode) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#1e1e1e]">
        {titleBar}
        {sandpackLayout}
      </div>,
      document.body,
    );
  }

  return (
    <>
      <div className="my-4 w-full overflow-hidden rounded-lg border border-gray-200 bg-[#1e1e1e] shadow-md">
        {titleBar}
        {!isFullscreen && sandpackLayout}
      </div>

      {isFullscreen && createPortal(fullscreenPortal, document.body)}
    </>
  );
}

export function SandpackViewer({
  template,
  files,
  showPreview,
  editable,
  lockedFiles,
  presentationMode = false,
}: SandpackViewerProps) {
  const { resolvedTheme } = useTheme();
  const sandpackTheme = resolvedTheme === "dark" ? "dark" : "light";
  const hasCustomFiles = Object.keys(files).length > 0;
  const sandpackFiles = hasCustomFiles ? files : undefined;

  // Normalise lockedFiles — can arrive as a JSON string or a string array.
  const authorLockedFiles = useMemo((): string[] => {
    if (!lockedFiles) return [];
    if (Array.isArray(lockedFiles)) return lockedFiles;
    try {
      const parsed = JSON.parse(lockedFiles);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [lockedFiles]);

  return (
    <SandpackProvider
      template={template}
      files={sandpackFiles}
      theme={sandpackTheme}
      options={{ recompileMode: "delayed", recompileDelay: 500 }}
    >
      <ViewerContent
        template={template}
        showPreview={showPreview}
        editable={editable}
        authorLockedFiles={authorLockedFiles}
        presentationMode={presentationMode}
      />
    </SandpackProvider>
  );
}
