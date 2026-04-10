"use client";

import { useState } from "react";
import { Dataset } from "@/types";
import { deleteDataset } from "@/lib/requests/dataset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IconTrash, IconFile } from "@tabler/icons-react";

/** Format bytes into human-readable file size. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Map dataset file type to badge color class. */
function formatBadgeClass(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case "csv":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "json":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "xlsx":
    case "xls":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800";
  }
}

interface DatasetListProps {
  datasets: Dataset[];
  /** Called after a dataset is successfully deleted, with its ID. */
  onDelete: (datasetId: number) => void;
}

export function DatasetList({ datasets, onDelete }: DatasetListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const datasetToDelete = datasets.find((d) => d.id === pendingDeleteId);

  const handleDeleteClick = (id: number) => {
    setPendingDeleteId(id);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId == null) return;

    setDeletingId(pendingDeleteId);
    setIsDialogOpen(false);

    const result = await deleteDataset(pendingDeleteId);

    if (result.ok) {
      toast.success("Dataset deleted successfully.");
      onDelete(pendingDeleteId);
    } else {
      toast.error(result.error ?? "Failed to delete dataset.");
    }

    setDeletingId(null);
    setPendingDeleteId(null);
  };

  const handleCancelDelete = () => {
    setIsDialogOpen(false);
    setPendingDeleteId(null);
  };

  if (datasets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
        <IconFile className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No datasets uploaded yet
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {datasets.map((dataset) => (
          <li
            key={dataset.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors dark:border-slate-700",
              "hover:bg-slate-50 dark:hover:bg-slate-800/50",
              deletingId === dataset.id && "opacity-50",
            )}
          >
            {/* Icon */}
            <IconFile className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />

            {/* Name and metadata */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {dataset.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatFileSize(dataset.fileSize)}</span>
              </div>
            </div>

            {/* Format badge */}
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs",
                formatBadgeClass(dataset.format),
              )}
            >
              {dataset.format.toUpperCase()}
            </Badge>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
              aria-label={`Delete ${dataset.name}`}
              disabled={deletingId === dataset.id}
              onClick={() => handleDeleteClick(dataset.id)}
            >
              <IconTrash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </li>
        ))}
      </ul>

      {/* Confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {datasetToDelete?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
