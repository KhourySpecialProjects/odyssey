"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dataset } from "@/types";
import { uploadDataset, deleteDataset } from "@/lib/actions";
import { updateDroplet } from "@/lib/requests/droplet";
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
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

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
      const response = await updateDroplet(dropletId, {
        datasets: [
          ...datasets.map(({ id: _id, ...d }) => d),
          {
            name: file.name,
            url: result.url!,
            fileType: ext,
            fileSize: file.size,
          },
        ],
      });

      if (!response.ok) {
        await deleteDataset(result.url!);
        toast.error("Failed to save dataset.");
        return;
      }

      toast.success(`"${file.name}" uploaded.`);
      router.refresh();
    });
  }

  async function handleRemove(dataset: Dataset) {
    startTransition(async () => {
      const response = await updateDroplet(dropletId, {
        datasets: datasets
          .filter((d) => d.id !== dataset.id)
          .map(({ id: _id, ...d }) => d),
      });

      if (!response.ok) {
        toast.error("Failed to remove dataset.");
        return;
      }

      await deleteDataset(dataset.url);
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
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Upload data files for use in notebook code blocks (CSV, JSON, or XLSX)
      </p>

      <div className="mt-4 space-y-3">
        {/* Counter row */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Datasets
          </span>
          <span className="rounded-full border border-slate-200 px-3 py-0.5 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
            {datasets.length} / {MAX_DATASETS} datasets
          </span>
        </div>

        {/* Drop zone */}
        {datasets.length < MAX_DATASETS && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload dataset"
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
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
            <IconUpload className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Drag &amp; drop a file here, or{" "}
              <span className="text-sky-600 underline dark:text-sky-400">
                click to browse
              </span>
            </p>
            <p className="text-xs text-slate-400">
              CSV, JSON, XLSX — max 25 MB
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Dataset list */}
        <div className="rounded-lg border border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-600 dark:bg-slate-800">
          {datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-600 dark:text-slate-300">
              <IconFile className="h-6 w-6" />
              <p className="text-sm">No datasets uploaded yet</p>
            </div>
          ) : (
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
                        {dataset.fileType} · {formatBytes(dataset.fileSize)}
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
          )}
        </div>
      </div>
    </section>
  );
}
