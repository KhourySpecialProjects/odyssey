"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Voyage } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteVoyage } from "@/lib/requests/voyage";
import { cn } from "@/lib/utils";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  published: {
    label: "Published",
    className: "bg-[#ecfdf3] text-[#14ba6d] border-0",
  },
  draft: {
    label: "Draft",
    className: "bg-[#f8f9fa] text-[#667085] border-0",
  },
};

interface VoyagesAdminPageClientProps {
  voyages: Voyage[];
}

export function VoyagesAdminPageClient({
  voyages: initialVoyages,
}: VoyagesAdminPageClientProps) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [voyages, setVoyages] = useState<Voyage[]>(initialVoyages);

  const filtered = useMemo(() => {
    if (!search.trim()) return voyages;
    return voyages.filter((v) =>
      v.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [voyages, search]);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this voyage?")) return;
    setDeletingId(id);
    try {
      const result = await deleteVoyage(id);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to delete voyage.");
        return;
      }
      setVoyages((prev) => prev.filter((v) => v.id !== id));
      toast.success("Voyage deleted.");
    } catch {
      toast.error("An unexpected error occurred while deleting the voyage.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search voyages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-[44px] w-full rounded-[30px] border border-slate-200 bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none sm:w-[560px] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <Link href="/new/voyage">
          <Button className="shrink-0">New Voyage</Button>
        </Link>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No voyages found.
          </p>
        ) : (
          filtered.map((voyage) => {
            const islandCount = voyage.voyage_playlists?.length ?? 0;
            const statusConfig = STATUS_CONFIG[voyage.status] ?? null;

            return (
              <div
                key={voyage.id}
                className="rounded-xl border border-[#e2e8f0] bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/v/${voyage.slug}`}
                    className="min-w-0 truncate text-sm font-semibold text-[#101828] underline hover:text-[#2D7597] dark:text-white"
                  >
                    {voyage.name}
                  </Link>
                  {statusConfig && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        statusConfig.className,
                      )}
                    >
                      {statusConfig.label}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-[#667085] dark:text-slate-400">
                    {islandCount} island{islandCount !== 1 && "s"}
                  </span>
                  {voyage.createdAt && (
                    <span className="text-xs text-[#667085] dark:text-slate-400">
                      {new Date(voyage.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] md:block dark:border-slate-700">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
              {[
                "Name",
                "Status",
                "Islands",
                "Author",
                "Created",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="h-[55px] px-6 py-3 text-left text-[16px] font-medium text-[#667085] first:pl-[30px] dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-sm text-slate-500"
                >
                  No voyages found.
                </td>
              </tr>
            ) : (
              filtered.map((voyage) => {
                const islandCount = voyage.voyage_playlists?.length ?? 0;
                const statusConfig = STATUS_CONFIG[voyage.status] ?? null;
                const authorName =
                  voyage.authors && voyage.authors.length > 0
                    ? voyage.authors
                        .map(
                          (a) =>
                            (a && typeof a === "object" && "name" in a
                              ? a.name
                              : null) ??
                            (a && typeof a === "object" && "email" in a
                              ? a.email
                              : "Unknown"),
                        )
                        .join(", ")
                    : "—";

                return (
                  <tr
                    key={voyage.id}
                    className="border-b border-[#eaecf0] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                  >
                    {/* Name */}
                    <td className="h-[56px] py-3 pr-6 pl-[30px]">
                      <Link
                        href={`/v/${voyage.slug}`}
                        className="truncate text-[16px] font-medium text-[#101828] underline hover:text-[#2D7597] dark:text-white"
                      >
                        {voyage.name}
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="h-[56px] px-6 py-[11px]">
                      {statusConfig ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-[16px] px-[9px] py-[4px] text-[14px] leading-[18px] font-medium",
                            statusConfig.className,
                          )}
                        >
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">&mdash;</span>
                      )}
                    </td>

                    {/* Islands */}
                    <td className="h-[56px] px-6 py-3">
                      <span className="text-[16px] text-[#101828] dark:text-white">
                        {islandCount}
                      </span>
                    </td>

                    {/* Author */}
                    <td className="h-[56px] px-6 py-3">
                      <span className="truncate text-[16px] text-[#101828] dark:text-white">
                        {authorName}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="h-[56px] px-6 py-3">
                      <span className="text-[16px] text-[#101828] dark:text-white">
                        {voyage.createdAt
                          ? new Date(voyage.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="h-[56px] px-6 py-3">
                      <TooltipProvider delayDuration={300}>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label="view voyage"
                                className="h-8 w-8 p-0"
                                asChild
                              >
                                <Link href={`/v/${voyage.slug}`}>
                                  <IconPencil className="h-4 w-4 text-sky-600" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View voyage</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label="delete voyage"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDelete(voyage.id)}
                                disabled={deletingId === voyage.id}
                              >
                                <IconTrash className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete voyage</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
