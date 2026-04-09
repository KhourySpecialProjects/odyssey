"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dataset } from "@/types";
import {
  uploadDataset,
  deleteDataset as deleteDatasetFile,
} from "@/lib/actions";
import {
  createDataset,
  deleteDataset as deleteDatasetRecord,
} from "@/lib/requests/dataset";
import { toast } from "sonner";
import { IconUpload, IconFile, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const MAX_DATASETS = 5;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Datasets({
  dropletId,
  datasets,
}: {
  dropletId: number;
  datasets: Dataset[];
}) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [pageIsDragging, setPageIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Page-level drag detection
  useEffect(() => {
    if (datasets.length >= MAX_DATASETS) return;

    function handleDragEnter(e: DragEvent) {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setPageIsDragging(true);
      }
    }
    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setPageIsDragging(false);
      }
    }
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function handleDrop(e: DragEvent) {
      e.preventDefault();
      dragCounterRef.current = 0;
      setPageIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleUpload(file);
    }

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasets.length]);

  async function handleUpload(file: File) {
    if (datasets.length >= MAX_DATASETS) {
      toast.error(`Maximum ${MAX_DATASETS} datasets allowed.`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadDataset(formData);

    if (!result.ok || !result.url) {
      toast.error(result.error ?? "Upload failed.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    startTransition(async () => {
      const response = await createDataset({
        name: file.name,
        format: ext as "csv" | "json" | "xlsx",
        fileUrl: result.url!,
        fileSize: file.size,
        droplet: dropletId,
      });

      if (!response.ok) {
        await deleteDatasetFile(result.url!);
        toast.error("Failed to save dataset.");
        return;
      }

      toast.success(`"${file.name}" uploaded.`);
      router.refresh();
    });
  }

  async function handleRemove(dataset: Dataset) {
    startTransition(async () => {
      const response = await deleteDatasetRecord(dataset.id);

      if (!response.ok) {
        toast.error("Failed to remove dataset.");
        return;
      }

      await deleteDatasetFile(dataset.fileUrl);
      toast.success(`"${dataset.name}" removed.`);
      router.refresh();
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <section className="w-full">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Datasets
      </h2>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-slate-600 dark:text-slate-300">
          Upload data files for use in notebook code blocks (CSV, JSON, or XLSX)
        </p>
        <span className="ml-4 shrink-0 rounded-full border border-[#D0D5DD] px-3 py-0.5 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          {datasets.length} / {MAX_DATASETS} datasets
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {/* Drop zone */}
        {datasets.length < MAX_DATASETS && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload dataset"
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-5 py-5 transition-colors",
              isDragging
                ? "border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
                : "border-[#D0D5DD] bg-[#fcfcfd] hover:border-[#2D7597] dark:border-slate-600 dark:bg-slate-800 dark:hover:border-[#2D7597]",
              isPending && "pointer-events-none opacity-60",
            )}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <IconUpload className="h-5 w-5 shrink-0 text-[#121216] dark:text-slate-300" />
            <div>
              <p className="text-sm text-[#121216] dark:text-slate-300">
                Drag &amp; drop a file here, or{" "}
                <span className="text-sky-600 underline dark:text-sky-400">
                  click to browse
                </span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                CSV, JSON, XLSX — max 25 MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Dataset list — only show when there are datasets */}
        {datasets.length > 0 && (
          <div className="rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-600 dark:bg-slate-800">
            <ul className="divide-y divide-slate-200 dark:divide-slate-600">
              {datasets.map((dataset) => (
                <li
                  key={dataset.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <IconFile className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {dataset.name}
                      </p>
                      <p className="text-xs text-slate-400 uppercase">
                        {dataset.format} · {formatBytes(dataset.fileSize)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${dataset.name}`}
                    disabled={isPending}
                    onClick={() => handleRemove(dataset)}
                    className="ml-4 shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Full-page drop overlay */}
      {pageIsDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-white/60 bg-white/90 px-16 py-12 shadow-2xl dark:border-slate-400 dark:bg-slate-800/90">
            <IconUpload className="h-12 w-12 text-[#297496]" />
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              Drop your dataset here
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              CSV, JSON, or XLSX — max 25 MB
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
