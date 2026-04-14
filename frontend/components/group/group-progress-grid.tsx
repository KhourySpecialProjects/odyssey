"use client";

import { Droplet, Voyage, VoyageNode } from "@/types";
import { Playlist } from "@/types";
import { AuthorizedUser } from "@/types";
import React, { useMemo, useState } from "react";
import { FileSpreadsheet, MoveLeft, MoveRight } from "lucide-react";
import { Button } from "../ui/button";
import * as XLSX from "xlsx-js-style";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GroupProgressGridProps {
  group: {
    id: number;
    groupName: string;
    slug: string;
    description?: string;
    isArchived: boolean;
    members?: AuthorizedUser[];
    droplets?: Droplet[];
    playlists?: Playlist[];
    voyages?: Voyage[];
  };
  statuses: Record<
    string,
    { completionPercentage: number; completionDate: Date | undefined }
  >;
  voyageStatuses?: Record<string, { completionPercentage: number }>;
}

export function GroupProgressGrid({ group, statuses }: GroupProgressGridProps) {
  const [selectedValue, setSelectedValue] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  const sortedMembers = useMemo(() => {
    if (!group.members) return [];
    return [...group.members].sort((a, b) => {
      const aValue = a.lastName || a.email;
      const bValue = b.lastName || b.email;
      return aValue.localeCompare(bValue);
    });
  }, [group.members]);

  const hasDroplets = (group.droplets?.length ?? 0) > 0;
  const hasVoyages = (group.voyages?.length ?? 0) > 0;

  // Determine if the selected value is a voyage
  const selectedVoyage = useMemo(() => {
    if (!selectedValue.startsWith("voyage-")) return null;
    const voyageId = parseInt(selectedValue.replace("voyage-", ""), 10);
    return group.voyages?.find((v) => v.id === voyageId) || null;
  }, [selectedValue, group.voyages]);

  const isShowingVoyage = selectedVoyage !== null;

  // Collect voyage droplets (deduped against group droplets)
  const voyageDroplets = useMemo(() => {
    const groupDropletIds = new Set((group.droplets || []).map((d) => d.id));
    const seen = new Set<number>();
    const result: Droplet[] = [];
    (group.voyages || []).forEach((v) => {
      (v.voyage_nodes || [])
        .filter(
          (n: VoyageNode) => n.nodeType === "playlist" && n.playlist?.droplets,
        )
        .sort((a: VoyageNode, b: VoyageNode) => a.orderIndex - b.orderIndex)
        .forEach((n: VoyageNode) => {
          for (const d of n.playlist!.droplets!) {
            if (!groupDropletIds.has(d.id) && !seen.has(d.id)) {
              seen.add(d.id);
              result.push(d);
            }
          }
        });
    });
    return result;
  }, [group.droplets, group.voyages]);

  // Droplet view
  const getDisplayedDroplets = () => {
    if (isShowingVoyage) return [];
    if (selectedValue === "all")
      return [...(group.droplets || []), ...voyageDroplets];
    return (
      group.playlists?.find((playlist) => playlist.name === selectedValue)
        ?.droplets || []
    );
  };

  const displayedDroplets = getDisplayedDroplets();
  const totalDropletPages = Math.ceil(displayedDroplets.length / itemsPerPage);
  const paginatedDroplets = displayedDroplets.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  // Voyage view
  const voyagePlaylistNodes = useMemo(() => {
    if (!selectedVoyage) return [];
    return (selectedVoyage.voyage_nodes || [])
      .filter(
        (node: VoyageNode) => node.nodeType === "playlist" && node.playlist,
      )
      .sort((a: VoyageNode, b: VoyageNode) => a.orderIndex - b.orderIndex);
  }, [selectedVoyage]);

  const totalVoyagePages = Math.ceil(voyagePlaylistNodes.length / itemsPerPage);
  const paginatedNodes = voyagePlaylistNodes.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  const totalPages = isShowingVoyage ? totalVoyagePages : totalDropletPages;

  const getCompletionStatus = (memberId: number, dropletId: number) => {
    const key = `${memberId}-${dropletId}`;
    const status = statuses[key];
    if (!status) return 0;
    return Math.floor(status.completionPercentage * 100) / 100 || 0;
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return "bg-emerald-500";
    if (pct > 33) return "bg-amber-400";
    return "bg-red-400";
  };

  const getMemberLabel = (member: AuthorizedUser) =>
    member.firstName || member.lastName
      ? `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()
      : member.email;

  const getPlaylistCompletion = (memberId: number, node: VoyageNode) => {
    const dropletIds = node.playlist?.droplets?.map((d) => d.id) || [];
    if (dropletIds.length === 0) return 0;
    let completed = 0;
    for (const did of dropletIds) {
      const s = statuses[`${memberId}-${did}`];
      if (s && s.completionPercentage >= 100) completed++;
    }
    return Math.round((completed / dropletIds.length) * 100);
  };

  const exportGridToExcel = () => {
    try {
      if (sortedMembers) {
        const headers: string[] = [];
        const allDroplets = [...(group.droplets || []), ...voyageDroplets];
        allDroplets.forEach((droplet) => {
          headers.push(`${droplet.name}`);
          headers.push("Completion Date");
        });

        const allVoyagePlaylistNodes: { voyage: Voyage; node: VoyageNode }[] =
          [];
        (group.voyages || []).forEach((voyage) => {
          (voyage.voyage_nodes || [])
            .filter((n: VoyageNode) => n.nodeType === "playlist" && n.playlist)
            .sort((a: VoyageNode, b: VoyageNode) => a.orderIndex - b.orderIndex)
            .forEach((node: VoyageNode) => {
              allVoyagePlaylistNodes.push({ voyage, node });
              headers.push(
                `${voyage.name} - ${node.playlist?.name || node.label}`,
              );
            });
        });

        const rows = sortedMembers.map((member) => {
          const row: (string | number)[] = [];
          const memberName =
            member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : "N/A";
          row.push(member.email, memberName);

          allDroplets.forEach((droplet) => {
            const key = `${member.id}-${droplet.id}`;
            const status = statuses[key];
            if (status) {
              row.push(status.completionPercentage);
              if (
                status.completionPercentage === 100 &&
                status.completionDate
              ) {
                const completionDate = new Date(status.completionDate);
                const month = (completionDate.getMonth() + 1)
                  .toString()
                  .padStart(2, "0");
                const day = completionDate
                  .getDate()
                  .toString()
                  .padStart(2, "0");
                const year = completionDate.getFullYear();
                const hours = completionDate
                  .getHours()
                  .toString()
                  .padStart(2, "0");
                const minutes = completionDate
                  .getMinutes()
                  .toString()
                  .padStart(2, "0");
                row.push(`${month}/${day}/${year} ${hours}:${minutes}`);
              } else {
                row.push("");
              }
            } else {
              row.push(0, "");
            }
          });

          allVoyagePlaylistNodes.forEach(({ node }) => {
            row.push(getPlaylistCompletion(member.id, node));
          });

          return row;
        });

        const curDate = new Date();
        const hours = curDate.getHours().toString().padStart(2, "0");
        const minutes = curDate.getMinutes().toString().padStart(2, "0");

        const data = [
          [
            `Recorded on: ${curDate.getMonth() + 1}/${curDate.getDate()}/${curDate.getFullYear()} ${hours}:${minutes}`,
            "",
            ...headers,
          ],
          ...rows,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const range = XLSX.utils.decode_range(worksheet["!ref"]!);
        const dropletCount = allDroplets.length;
        const voyageStartCol = 2 + dropletCount * 2;

        const applyColorToCell = (cellAddress: string) => {
          const cell = worksheet[cellAddress];
          if (!cell || typeof cell.v !== "number") return;
          const value = cell.v;
          if (value === 100) {
            cell.s = {
              fill: { fgColor: { rgb: "90EE90" } },
              font: { bold: true },
            };
          } else if (value >= 0 && value <= 33) {
            cell.s = {
              fill: { fgColor: { rgb: "FFCCCC" } },
              font: { bold: true },
            };
          } else if (value > 33 && value < 100) {
            cell.s = {
              fill: { fgColor: { rgb: "FFFFCC" } },
              font: { bold: true },
            };
          }
        };

        for (let R = 1; R <= range.e.r; ++R) {
          for (let C = 2; C < voyageStartCol; C += 2) {
            applyColorToCell(XLSX.utils.encode_cell({ r: R, c: C }));
          }
          for (let C = voyageStartCol; C <= range.e.c; C++) {
            applyColorToCell(XLSX.utils.encode_cell({ r: R, c: C }));
          }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Progress");
        XLSX.writeFile(
          workbook,
          `${group.groupName.replace(/ /g, "_")}_progress_report_${curDate.getMonth() + 1}_${curDate.getDate()}_${curDate.getFullYear()}.xlsx`,
        );
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export group progress");
    }
  };

  // Default to first voyage if no droplets exist
  const defaultValue = hasDroplets
    ? "all"
    : hasVoyages
      ? `voyage-${group.voyages![0].id}`
      : "all";

  // Set default on first render if needed
  if (selectedValue === "all" && !hasDroplets && hasVoyages) {
    setSelectedValue(defaultValue);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={selectedValue}
            onValueChange={(value) => {
              setSelectedValue(value);
              setCurrentPage(0);
            }}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hasDroplets && (
                <SelectGroup>
                  <SelectLabel>Droplets</SelectLabel>
                  <SelectItem value="all">Droplets — All</SelectItem>
                  {group.playlists?.map((option) => (
                    <SelectItem key={option.name} value={option.name}>
                      Droplets — {option.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {hasVoyages && (
                <SelectGroup>
                  <SelectLabel>Voyages</SelectLabel>
                  {group.voyages!.map((voyage) => (
                    <SelectItem key={voyage.id} value={`voyage-${voyage.id}`}>
                      Voyage — {voyage.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportGridToExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 0}
            >
              <MoveLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[#667085] dark:text-slate-400">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              <MoveRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Droplet Progress Table */}
      {!isShowingVoyage && displayedDroplets.length > 0 && (
        <div className="rounded-lg border border-[#D0D5DD] dark:border-slate-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
                <th className="min-w-[200px] px-4 py-3 text-left text-sm font-medium text-[#667085] dark:text-slate-400">
                  Member
                </th>
                {paginatedDroplets.map((droplet) => (
                  <th
                    key={droplet.id}
                    className="px-4 py-3 text-left text-sm font-medium text-[#667085] dark:text-slate-400"
                  >
                    <span className="line-clamp-2" title={droplet.name}>
                      {droplet.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {sortedMembers.map((member, idx) => (
                <tr
                  key={member.id}
                  className={
                    idx < sortedMembers.length - 1
                      ? "border-b border-[#D0D5DD] dark:border-slate-700"
                      : ""
                  }
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {getMemberLabel(member)}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-slate-400">
                      {member.email}
                    </div>
                  </td>
                  {paginatedDroplets.map((droplet) => {
                    const pct = getCompletionStatus(member.id, droplet.id);
                    return (
                      <td key={droplet.id} className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span
                              className={
                                pct >= 100
                                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                                  : "text-[#667085] dark:text-slate-400"
                              }
                            >
                              {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Voyage Progress Table */}
      {isShowingVoyage && paginatedNodes.length > 0 && (
        <div className="rounded-lg border border-[#D0D5DD] dark:border-slate-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D0D5DD] bg-[#fcfcfd] dark:border-slate-700 dark:bg-slate-800">
                <th className="min-w-[200px] px-4 py-3 text-left text-sm font-medium text-[#667085] dark:text-slate-400">
                  Member
                </th>
                {paginatedNodes.map((node: VoyageNode) => (
                  <th
                    key={node.id}
                    className="px-4 py-3 text-left text-sm font-medium text-[#667085] dark:text-slate-400"
                  >
                    <span
                      className="line-clamp-2"
                      title={node.playlist?.name || node.label}
                    >
                      {node.playlist?.name || node.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
              {sortedMembers.map((member, idx) => (
                <tr
                  key={member.id}
                  className={
                    idx < sortedMembers.length - 1
                      ? "border-b border-[#D0D5DD] dark:border-slate-700"
                      : ""
                  }
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {getMemberLabel(member)}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-slate-400">
                      {member.email}
                    </div>
                  </td>
                  {paginatedNodes.map((node: VoyageNode) => {
                    const pct = getPlaylistCompletion(member.id, node);
                    return (
                      <td key={node.id} className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span
                              className={
                                pct >= 100
                                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                                  : "text-[#667085] dark:text-slate-400"
                              }
                            >
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isShowingVoyage && displayedDroplets.length === 0 && !hasVoyages && (
        <div className="rounded-xl border border-[#D0D5DD] py-16 text-center dark:border-slate-600">
          <p className="text-sm text-[#475569] dark:text-slate-400">
            No droplets have been added to this group yet.
          </p>
        </div>
      )}
    </div>
  );
}
