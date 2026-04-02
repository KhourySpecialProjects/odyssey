"use client";

import { useState, useMemo, useEffect, memo, lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  GripVertical,
  MergeIcon,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Droplet, Lesson } from "@/types";
import type { ImportSection, ImportImage } from "@/lib/import/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  mergeSections,
  deleteSection,
  updateSectionTitle,
  updateSectionContent,
  fixTrailingHeadings,
} from "@/lib/import/section-helpers";
import {
  extractRawText,
  sectionsToLessons,
  cleanSections,
} from "@/lib/import/import-orchestrator";
import { splitTextWithAI } from "@/lib/import/split-with-ai";
import { createLessonsFromImport } from "@/lib/import/create-lessons";
import { MAX_FILE_SIZE } from "@/lib/import/constants";

const Markdown = lazy(() => import("react-markdown"));

type Step = "upload" | "preview" | "creating";

interface ImportFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  droplet: Pick<Droplet, "id" | "name" | "slug" | "lessons" | "difficulty">;
  onAddLessons: (newLessons: Lesson[]) => void;
}

export function ImportFileModal({
  isOpen,
  onClose,
  droplet,
  onAddLessons,
}: ImportFileModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState("");
  const [sections, setSections] = useState<ImportSection[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creationProgress, setCreationProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [creationError, setCreationError] = useState("");
  const [creationStage, setCreationStage] = useState("");
  const [extractedImages, setExtractedImages] = useState<
    Map<string, ImportImage>
  >(new Map());

  const fileName = selectedFile?.name ?? "";
  const fileType: "pdf" | "pptx" = fileName.endsWith(".pptx") ? "pptx" : "pdf";
  const progressText = creationProgress
    ? `${creationStage || "Creating lessons"}: ${creationProgress.current} of ${creationProgress.total}...`
    : "Preparing lessons...";

  // Create blob URLs for image previews, clean up on unmount
  const blobUrls = useMemo(() => {
    const urls = new Map<string, string>();
    for (const [id, img] of extractedImages) {
      urls.set(`IMPORT_IMG_${id}`, URL.createObjectURL(img.blob));
    }
    return urls;
  }, [extractedImages]);

  useEffect(() => {
    return () => {
      for (const url of blobUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [blobUrls]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function validateAndSetFile(file: File | null) {
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".pptx")) {
      toast.error("Please upload a PDF (.pdf) or PowerPoint (.pptx) file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB.`,
      );
      return;
    }
    if (file.size === 0) {
      toast.error("File is empty. Please select a valid file.");
      return;
    }
    setSelectedFile(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    validateAndSetFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingFile(false);
    validateAndSetFile(e.dataTransfer.files[0] ?? null);
  }

  async function handleExtract() {
    if (!selectedFile) return;
    setIsExtracting(true);

    try {
      setExtractionStatus(
        fileType === "pdf"
          ? "Reading PDF..."
          : "Extracting text from slides...",
      );
      const {
        text,
        fileType: detectedType,
        warnings: extractWarnings,
        images,
      } = await extractRawText(selectedFile);
      setExtractedImages(images);

      setExtractionStatus("Splitting into lessons with AI...");
      const { sections: aiSections, warnings: aiWarnings } =
        await splitTextWithAI(text, detectedType, selectedFile.name);

      setSections(cleanSections(fixTrailingHeadings(aiSections)));
      setWarnings([...extractWarnings, ...aiWarnings]);
      setStep("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed.";
      toast.error(msg);
    } finally {
      setIsExtracting(false);
      setExtractionStatus("");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = sections.findIndex((s) => s.id === active.id);
    const toIndex = sections.findIndex((s) => s.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      setSections(arrayMove(sections, fromIndex, toIndex));
    }
  }

  function handleTitleChange(id: string, newTitle: string) {
    setSections(updateSectionTitle(sections, id, newTitle));
  }

  function handleDelete(id: string) {
    setSections(deleteSection(sections, id));
  }

  function handleContentChange(id: string, newContent: string) {
    setSections(updateSectionContent(sections, id, newContent));
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMergeSelected() {
    if (selectedIds.size !== 2) {
      toast.error("Select exactly 2 adjacent sections to merge.");
      return;
    }

    const selectedList = sections
      .filter((s) => selectedIds.has(s.id))
      .map((s) => s.id);

    const newSections = mergeSections(
      sections,
      selectedList[0],
      selectedList[1],
    );
    if (newSections === sections) {
      toast.error("Can only merge adjacent sections.");
      return;
    }

    setSections(newSections);
    setSelectedIds(new Set());
  }

  async function handleCreateLessons() {
    if (sections.length === 0) return;

    setStep("creating");
    setCreationError("");

    const lessonsData = sectionsToLessons(sections);
    const startOrderIndex = droplet.lessons?.length ?? 0;

    const { created, errors } = await createLessonsFromImport({
      dropletId: droplet.id,
      startOrderIndex,
      lessons: lessonsData,
      images: extractedImages.size > 0 ? extractedImages : undefined,
      onProgress: (current, total, stage) => {
        setCreationProgress({ current, total });
        setCreationStage(stage);
      },
    });

    if (errors.length > 0) {
      const errMsg = `${errors.length} lesson(s) failed to create.`;
      setCreationError(errMsg);
      toast.error(errMsg);
    }

    if (created.length > 0) {
      onAddLessons(created);
      toast.success(
        `${created.length} lesson${created.length > 1 ? "s" : ""} imported successfully!`,
      );
      handleClose();
    } else {
      setStep("preview");
    }
  }

  function handleClose() {
    setStep("upload");
    setSelectedFile(null);
    setSections([]);
    setWarnings([]);
    setSelectedIds(new Set());
    setCreationProgress(null);
    setCreationError("");
    setCreationStage("");
    setExtractionStatus("");
    setExtractedImages(new Map());
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import from PDF or PPTX"}
            {step === "preview" && `Preview Lessons — ${fileName}`}
            {step === "creating" && "Creating Lessons..."}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              `Import lessons into "${droplet.name}" from a PDF or PowerPoint file.`}
            {step === "preview" &&
              `${sections.length} lesson${sections.length !== 1 ? "s" : ""} detected. Edit titles, reorder, merge, or delete before creating.`}
            {step === "creating" && progressText}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: File Upload */}
          {step === "upload" && (
            <div className="space-y-4 py-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleFileDrop}
                onClick={() =>
                  document.getElementById("file-import-input")?.click()
                }
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors",
                  isDraggingFile
                    ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700",
                )}
              >
                {selectedFile ? (
                  <>
                    <FileText className="mb-3 h-12 w-12 text-blue-500" />
                    <p className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB — click to
                      change
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-12 w-12 text-slate-400" />
                    <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      PDF or PowerPoint (.pdf, .pptx) up to 25MB
                    </p>
                  </>
                )}
              </div>
              <input
                id="file-import-input"
                type="file"
                accept=".pdf,.pptx"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isExtracting && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{extractionStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview & Edit */}
          {step === "preview" && (
            <div className="space-y-3 py-4">
              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Warnings:</p>
                      <ul className="mt-1 list-inside list-disc">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {selectedIds.size === 2 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMergeSelected}
                    className="flex items-center gap-1"
                  >
                    <MergeIcon className="h-3 w-3" />
                    Merge Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear selection
                  </Button>
                </div>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {sections.map((section) => (
                      <SortableSectionCard
                        key={section.id}
                        section={section}
                        isSelected={selectedIds.has(section.id)}
                        onToggleSelect={() => toggleSelection(section.id)}
                        onTitleChange={(title) =>
                          handleTitleChange(section.id, title)
                        }
                        onContentChange={(content) =>
                          handleContentChange(section.id, content)
                        }
                        onDelete={() => handleDelete(section.id)}
                        canDelete={sections.length > 1}
                        imageBlobUrls={blobUrls}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* STEP 3: Creating */}
          {step === "creating" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {progressText}
              </p>
              {creationError && (
                <p className="text-sm text-red-500">{creationError}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-200 pt-4 dark:border-slate-700">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExtract}
                disabled={!selectedFile || isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {extractionStatus || "Processing..."}
                  </>
                ) : (
                  "Extract & Split Lessons"
                )}
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setSections([]);
                  setSelectedIds(new Set());
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleCreateLessons}
                disabled={sections.length === 0}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Create {sections.length} Lesson
                {sections.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}

          {step === "creating" && (
            <Button variant="outline" disabled>
              Creating...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Sortable Section Card ---

interface SortableSectionCardProps {
  section: ImportSection;
  isSelected: boolean;
  onToggleSelect: () => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  imageBlobUrls: Map<string, string>;
}

const SortableSectionCard = memo(function SortableSectionCard({
  section,
  isSelected,
  onToggleSelect,
  onTitleChange,
  onContentChange,
  onDelete,
  canDelete,
  imageBlobUrls,
}: SortableSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const previewText = section.markdownContent.slice(0, 200).replace(/\n/g, " ");
  const isLong = section.markdownContent.length > 200;

  const cleanContent = section.markdownContent.trim();

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-white p-3 transition-shadow dark:bg-slate-900",
        isSelected
          ? "border-blue-400 shadow-md dark:border-blue-600"
          : "border-slate-200 dark:border-slate-700",
        isDragging && "z-10 opacity-80 shadow-xl",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-slate-400" />
        </button>

        {/* Select checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300"
          aria-label={`Select ${section.title}`}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={section.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="flex-1 truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold hover:border-slate-300 focus:border-slate-400 focus:outline-none dark:hover:border-slate-600 dark:focus:border-slate-500"
              aria-label="Lesson title"
            />
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {section.sourceInfo}
            </span>
          </div>

          {/* Collapsed preview */}
          {!isExpanded && section.markdownContent && (
            <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
              {previewText}
              {isLong && "..."}
            </p>
          )}

          {/* Expand/collapse + edit toggles */}
          {section.markdownContent && (
            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={() => {
                  setIsExpanded(!isExpanded);
                  if (isExpanded) setIsEditing(false);
                }}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                aria-label={isExpanded ? "Collapse preview" : "Preview lesson"}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide preview
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Preview lesson
                  </>
                )}
              </button>
              {isExpanded && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn(
                    "text-xs",
                    isEditing
                      ? "text-green-600 hover:text-green-700 dark:text-green-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300",
                  )}
                >
                  {isEditing ? "Done editing" : "Edit content"}
                </button>
              )}
            </div>
          )}

          {/* Expanded: edit or rendered preview */}
          {isExpanded && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {isEditing ? (
                <textarea
                  value={section.markdownContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  className="h-64 w-full resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-slate-700 outline-none dark:text-slate-300"
                  aria-label="Edit lesson content"
                />
              ) : (
                cleanContent && (
                  <div className="p-3">
                    <Suspense
                      fallback={
                        <p className="text-xs text-slate-400">
                          Loading preview...
                        </p>
                      }
                    >
                      <div className="prose prose-sm dark:prose-invert prose-headings:mt-2 prose-headings:mb-1 prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-p:my-1 prose-p:text-xs prose-p:leading-relaxed prose-ul:my-1 prose-ul:text-xs prose-ol:my-1 prose-ol:text-xs prose-li:my-0 prose-strong:font-semibold max-w-none">
                        <Markdown
                          components={{
                            img: ({ src, alt }) => {
                              const blobUrl = src && imageBlobUrls.get(src);
                              if (!blobUrl) return null;
                              return (
                                <img
                                  src={blobUrl}
                                  alt={alt || "Extracted image"}
                                  className="my-2 max-h-48 rounded border border-slate-200 dark:border-slate-600"
                                />
                              );
                            },
                          }}
                        >
                          {cleanContent}
                        </Markdown>
                      </div>
                    </Suspense>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Delete */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="mt-0.5 shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete ${section.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
});
