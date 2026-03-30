"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dataset } from "@/types";
import { parseDatasetFile, ParsedDataset } from "@/lib/dataset-parser";
import { uploadDataset } from "@/lib/actions";
import { createDataset } from "@/lib/requests/dataset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatasetList } from "@/components/draft/dataset/dataset-list";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IconUpload, IconFile, IconX, IconLoader2 } from "@tabler/icons-react";
import { MAX_DATASET_FILE_SIZE } from "@/lib/validations/dataset";

const MAX_DATASETS = 5;

/** Determine file format from file name. */
function getFileFormat(fileName: string): "csv" | "json" | "xlsx" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".xlsx")) return "xlsx";
  return null;
}

/** Upload state machine. */
type UploadState =
  | { status: "idle" }
  | { status: "parsing"; file: File }
  | {
      status: "preview";
      file: File;
      parsed: ParsedDataset;
      format: "csv" | "json" | "xlsx";
    }
  | { status: "uploading" }
  | { status: "error"; message: string };

interface DatasetUploadProps {
  dropletId: number;
  datasets: Dataset[];
}

export function DatasetUpload({ dropletId, datasets }: DatasetUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });
  const [localDatasets, setLocalDatasets] = useState<Dataset[]>(datasets);

  const atLimit = localDatasets.length >= MAX_DATASETS;

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles?: unknown[]) => {
      // Handle rejected files (size or type)
      if (
        rejectedFiles &&
        (rejectedFiles as { errors: { code: string; message: string }[] }[])
          .length > 0
      ) {
        const firstRejected = (
          rejectedFiles as { errors: { code: string; message: string }[] }[]
        )[0];
        const firstError = firstRejected.errors[0];
        if (firstError?.code === "file-too-large") {
          setUploadState({
            status: "error",
            message: "File is too large. Maximum file size is 25 MB.",
          });
        } else {
          setUploadState({
            status: "error",
            message:
              "Unsupported file type. Please upload a CSV, JSON, or XLSX file.",
          });
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const format = getFileFormat(file.name);

      if (!format) {
        setUploadState({
          status: "error",
          message:
            "Unsupported file type. Please upload a CSV, JSON, or XLSX file.",
        });
        return;
      }

      // Parse preview
      setUploadState({ status: "parsing", file });

      try {
        const parsed = await parseDatasetFile(file);
        setUploadState({ status: "preview", file, parsed, format });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to parse file. Please check the file format.";
        setUploadState({ status: "error", message });
      }
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: atLimit || uploadState.status === "uploading",
    maxSize: MAX_DATASET_FILE_SIZE,
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
  });

  const handleConfirmUpload = async () => {
    if (uploadState.status !== "preview") return;

    const { file, parsed, format } = uploadState;

    setUploadState({ status: "uploading" });

    // 1. Upload the file to S3
    const formData = new FormData();
    formData.append("file", file);

    const uploadResult = await uploadDataset(formData);

    if (!uploadResult.ok || !uploadResult.url) {
      toast.error(uploadResult.error ?? "Upload failed. Please try again.");
      setUploadState({ status: "idle" });
      return;
    }

    // 2. Create the dataset record in Strapi
    const createResult = await createDataset({
      name: file.name,
      format,
      fileUrl: uploadResult.url,
      fileSize: file.size,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      columnNames: parsed.columnNames,
      columnTypes: parsed.columnTypes,
      droplet: dropletId,
    });

    if (!createResult.ok || !createResult.data) {
      toast.error(
        createResult.error ?? "Failed to save dataset. Please try again.",
      );
      setUploadState({ status: "idle" });
      return;
    }

    toast.success(`"${file.name}" uploaded successfully.`);
    setLocalDatasets((prev) => [...prev, createResult.data!]);
    setUploadState({ status: "idle" });
  };

  const handleCancel = () => {
    setUploadState({ status: "idle" });
  };

  const handleDeleteLocal = (datasetId: number) => {
    setLocalDatasets((prev) => prev.filter((d) => d.id !== datasetId));
  };

  const isUploading = uploadState.status === "uploading";
  const isParsing = uploadState.status === "parsing";

  return (
    <div className="space-y-4">
      {/* Count badge and header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Datasets
        </p>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            atLimit
              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
          )}
        >
          {localDatasets.length} / {MAX_DATASETS} datasets
        </Badge>
      </div>

      {/* At-limit notice */}
      {atLimit && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Maximum of 5 datasets reached. Delete one to upload another.
        </p>
      )}

      {/* Drop zone — only shown when not at limit and no file pending */}
      {!atLimit && uploadState.status !== "preview" && (
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragActive
              ? "border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-900/20"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50",
            (isUploading || isParsing || atLimit) &&
              "cursor-not-allowed opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {isParsing ? (
              <>
                <IconLoader2 className="h-8 w-8 animate-spin text-sky-500" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Parsing file…
                </p>
              </>
            ) : isUploading ? (
              <>
                <IconLoader2 className="h-8 w-8 animate-spin text-sky-500" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Uploading…
                </p>
              </>
            ) : isDragActive ? (
              <>
                <IconUpload className="h-8 w-8 text-sky-500" />
                <p className="text-sm text-sky-600 dark:text-sky-400">
                  Drop to upload
                </p>
              </>
            ) : (
              <>
                <IconUpload className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Drag &amp; drop a file here, or{" "}
                  <span className="text-sky-600 underline dark:text-sky-400">
                    click to browse
                  </span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  CSV, JSON, XLSX &mdash; max 25 MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadState.status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <IconX className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">
            {uploadState.message}
          </p>
          <button
            type="button"
            className="ml-auto text-red-400 hover:text-red-600"
            onClick={() => setUploadState({ status: "idle" })}
            aria-label="Dismiss error"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Preview panel — shown after successful parse */}
      {uploadState.status === "preview" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700">
          {/* Preview header */}
          <div className="flex items-center gap-3 border-b border-slate-200 p-3 dark:border-slate-700">
            <IconFile className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {uploadState.file.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {uploadState.parsed.rowCount.toLocaleString()} rows &middot;{" "}
                {uploadState.parsed.columnCount} columns &middot;{" "}
                {uploadState.format.toUpperCase()}
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-slate-200 text-xs dark:border-slate-700"
            >
              Preview
            </Badge>
          </div>

          {/* Preview table — first 5 rows */}
          {uploadState.parsed.preview.length > 0 && (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {uploadState.parsed.columnNames.map((col) => (
                      <th
                        key={col}
                        className="px-2 py-1 text-left font-medium text-slate-500 dark:text-slate-400"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadState.parsed.preview.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={cn(
                        rowIdx % 2 === 0
                          ? "bg-white dark:bg-transparent"
                          : "bg-slate-50 dark:bg-slate-800/30",
                      )}
                    >
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className="max-w-[120px] truncate px-2 py-1 text-slate-700 dark:text-slate-300"
                          title={String(cell ?? "")}
                        >
                          {cell == null ? (
                            <span className="text-slate-300 dark:text-slate-600">
                              null
                            </span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploadState.parsed.rowCount > 5 && (
                <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                  Showing 5 of {uploadState.parsed.rowCount.toLocaleString()}{" "}
                  rows
                </p>
              )}
            </div>
          )}

          {/* Preview actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
              onClick={handleConfirmUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <IconUpload className="h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Dataset list */}
      <DatasetList datasets={localDatasets} onDelete={handleDeleteLocal} />
    </div>
  );
}
