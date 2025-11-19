"use client";

import { Badge } from "@/components/ui/badge";
import { uppercaseFirstChar } from "@/lib/utils";
import { Droplet } from "@/types";
import Link from "next/link";

import { StarRating } from "@/components/ui/rating-stars";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Clock, Download } from "lucide-react";
import { getDueDateBadgeColor } from "@/lib/utils";
import { DateTime } from "luxon";
import { archiveDroplet, favoriteDroplet } from "@/lib/requests/droplet";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";

interface DropletTileProps {
  droplet: Droplet;
  isEnrolled?: boolean;
  completedLessonIds?: number[];
  profilePage?: boolean;
  compact?: boolean;
  isArchived?: boolean;
  isFavorited?: boolean;
  dueDate?: string;
  isAdmin?: boolean;
}

export function DropletTile({
  droplet,
  isEnrolled = false,
  completedLessonIds = [],
  profilePage,
  compact,
  isArchived,
  isFavorited: initialIsFavorited,
  dueDate,
  isAdmin,
}: DropletTileProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isTextClamped, setIsTextClamped] = useState(false);
  const [isScreenChanged, setIsScreenChanged] = useState(false);
  const textRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited || false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);

  const strippedDescription = droplet.description
    ?.replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  useEffect(() => {
    if (textRef.current && strippedDescription) {
      const element = textRef.current as HTMLParagraphElement;
      const isClamped = element.scrollHeight > element.clientHeight;
      setIsTextClamped(isClamped);
    }
  }, [strippedDescription, descriptionExpanded]);

  useEffect(() => {
    const handleResize = () => {
      setIsScreenChanged(true);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isScreenChanged) {
      if (textRef.current && strippedDescription) {
        const element = textRef.current as HTMLParagraphElement;
        const isClamped = element.scrollHeight > element.clientHeight;
        setIsTextClamped(isClamped);
      }
      setIsScreenChanged(false);
    }
  }, [isScreenChanged, strippedDescription, descriptionExpanded]);

  const dropletLessonIds = droplet.lessons?.map((l) => l.id) || [];
  const completedLessonsInDroplet = completedLessonIds.filter((id) =>
    dropletLessonIds.includes(id),
  );
  const completionPercentage =
    dropletLessonIds.length > 0
      ? Math.round(
          (completedLessonsInDroplet.length / dropletLessonIds.length) * 100,
        )
      : 0;

  let daysUntil = 0;
  if (dueDate && dueDate !== "") {
    const dueDateObject = DateTime.fromISO(dueDate);
    const today = DateTime.local().startOf("day");
    const diffDays = dueDateObject.startOf("day").diff(today, "days").days;
    daysUntil = Math.ceil(diffDays);
  }

  const getCompletionBadgeColor = () => {
    if (completionPercentage === 0)
      return "bg-red-100 text-red-800 border-red-200";
    if (completionPercentage < 100)
      return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  async function changeVisibility() {
    try {
      const result = await archiveDroplet(droplet, isArchived ? false : true);
      if (result.success) {
        toast.success(
          isArchived
            ? `${droplet.name} is now unarchived!`
            : `${droplet.name} is now archived!`,
        );
      } else {
        toast.error("Failed to update droplet visibility");
      }
    } catch (error) {
      toast.error("An error occurred while updating the droplet");
      console.error(error);
    }
  }

  async function toggleFavorite() {
    if (isFavoritePending) return;

    setIsFavoritePending(true);
    const newFavoriteState = !isFavorited;

    try {
      const result = await favoriteDroplet(droplet, newFavoriteState);

      if (result.success) {
        setIsFavorited((prev) => !prev);
        toast.success(
          newFavoriteState
            ? `${droplet.name} added to favorites!`
            : `${droplet.name} removed from favorites!`,
        );
      } else {
        toast.error("Failed to update favorite status");
      }
    } catch (error) {
      toast.error("An error occurred while updating favorites");
      console.error(error);
    } finally {
      setIsFavoritePending(false);
    }
  }

  async function exportDropletMarkdown() {
    // mock markdown content
    const content = `# ${droplet.name}

## **Metadata**

Type: ${droplet.type}
Focus Area: ${droplet.focusArea}

### Tags
${droplet.tags?.map((tag) => `* ${tag.name}`).join("\n") || "No tags"}

### Authors
${droplet.authorized_users?.map((user) => `* ${user.firstName} ${user.lastName}`).join("\n") || "No authors"}

### Description
${droplet.description ? droplet.description.concat("\n") : "No description"} 

### Overview
${droplet.overview ? droplet.overview.concat("\n") : "No overview"}

### Learning Objectives
${droplet.learningObjectives?.map((objective) => `* ${objective.objective}`).join("\n") || "No objectives"}

### Next Steps
${droplet.nextSteps?.map((resource) => `* ${resource.label} linked to: ${resource.url}`).join("\n") || "No next steps"}

### Prerequisites
${droplet.prerequisites?.map((prereq) => `* ${prereq.name}`).join("\n") || "No prereqs"}

### Postrequisites
${droplet.postrequisites?.map((postreq) => `* ${postreq.name}`).join("\n") || "No postreqs"}

## **Lessons**
${
  droplet.lessons
    ?.map(
      (lesson) => `
### ${lesson.name}

${lesson.blocks
  ?.map((block) => {
    if (block.__component === "droplets.generic") {
      return `#### Generic Droplet\n\n${block.content}`;
    }

    if (block.__component === "droplets.expandable") {
      return `#### Expandable Droplet\n\n##### ${block.title}\n\n${block.content}`;
    }

    if (block.__component === "droplets.callout") {
      const calloutContent = block.content
        .map((contentBlock) =>
          contentBlock.children.map((child) => child.text).join(""),
        )
        .join("\n");
      return `#### Callout Droplet\n\nColor: ${block.color}\nType: ${block.type}\n\n${calloutContent}`;
    }

    if (block.__component === "droplets.video") {
      return `#### Video\n\nVideo Link: ${block.url}`;
    }

    if (block.__component === "droplets.quiz") {
      const quizContent = block.questions
        .map(
          (question, qIndex) =>
            `${qIndex + 1}. ${question.content}\n${question.answerOptions
              .map(
                (answer, aIndex) =>
                  `   ${aIndex + 1}. Answer: ${answer.content} is ${answer.isCorrect ? "correct" : "incorrect"}`,
              )
              .join("\n")}`,
        )
        .join("\n");
      return `#### Quiz\n\n${quizContent}`;
    }

    if (block.__component === "droplets.open-ended-quiz") {
      const openEndedContent = block.questions
        .map(
          (question, qIndex) =>
            `${qIndex + 1}. ${question.content}\n   * Answer: ${question.correctAnswer}`,
        )
        .join("\n");
      return `#### Open-Ended Quiz\n\n${openEndedContent}`;
    }

    return "";
  })
  .join("\n\n")}
`,
    )
    .join("\n") || "No lessons"
}
`;

    // creating a binary large object file of markdown type
    const blob = new Blob([content], { type: "text/markdown" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${droplet.name}.md`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (compact) {
    return (
      <li className="rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:bg-slate-800">
        <Link
          className="relative inline-flex h-full w-full p-2"
          href={`/d/${droplet.slug}`}
        >
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-center text-sm font-medium text-slate-900 dark:text-white">
              {droplet.name}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  if (profilePage) {
    return (
      <li className="rounded-md border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <Link
          className="relative inline-flex h-full w-full p-6"
          href={
            (droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`
          }
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <span className="text-3lg block text-center font-black text-slate-950 dark:text-slate-300">
              {droplet.name}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <Link
      href={(droplet.status == "draft" ? `/draft` : "") + `/d/${droplet.slug}`}
    >
      <li className="h-full rounded-md border border-slate-200 bg-slate-50 p-2 transition-colors hover:border-slate-300 dark:border-slate-500 dark:bg-slate-800">
        <div className="flex h-full flex-col justify-between gap-3 p-4">
          <div className="space-y-3">
            <div className="flex flex-0 flex-row flex-wrap gap-1.5">
              {droplet.status == "draft" ? (
                <Badge variant="destructive">Draft</Badge>
              ) : null}

              {completionPercentage != 100 && dueDate && dueDate !== "" && (
                <Badge
                  className={getDueDateBadgeColor(daysUntil, true)}
                  variant="outline"
                >
                  <Clock size={15} className="mr-1" />

                  {(() => {
                    if (
                      DateTime.fromISO(dueDate).toISODate() ==
                      DateTime.local().toISODate()
                    ) {
                      return "Due today!";
                    } else if (daysUntil === 1) {
                      return `Due in 1 day`;
                    } else if (daysUntil > 0) {
                      return `Due in ${daysUntil} days`;
                    } else {
                      return daysUntil === -1
                        ? `One Day Late!`
                        : `${Math.abs(daysUntil)} Days Late!`;
                    }
                  })()}
                </Badge>
              )}

              {isEnrolled && dropletLessonIds.length > 0 && (
                <Badge className={getCompletionBadgeColor()} variant="outline">
                  {completionPercentage}% Complete
                </Badge>
              )}

              <Badge className="pointer-events-none border-black bg-white text-black dark:bg-slate-300">
                {uppercaseFirstChar(droplet.focusArea)}
              </Badge>
              <Badge className="pointer-events-none border-black bg-white text-black dark:bg-slate-300">
                {uppercaseFirstChar(droplet.type)}
              </Badge>
              {droplet.tags?.map((tag) => (
                <Badge
                  key={tag.id}
                  className="pointer-events-none border-black bg-white text-black dark:bg-slate-300"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex flex-col justify-center gap-1">
              <span className="block w-full place-self-end text-3xl font-black text-slate-950 dark:text-slate-300">
                {droplet.name}
              </span>

              {strippedDescription &&
                strippedDescription.trim() !== "<p></p>" &&
                strippedDescription.trim() !== "" && (
                  <>
                    <p
                      ref={textRef}
                      className={`${
                        descriptionExpanded ? "line-clamp-none" : "line-clamp-2"
                      } text-md text-slate-700 dark:text-slate-300`}
                    >
                      {strippedDescription}
                    </p>

                    {isTextClamped && !descriptionExpanded && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDescriptionExpanded(true);
                        }}
                        className="text-left text-sm text-sky-700 dark:text-sky-500"
                      >
                        See More
                      </button>
                    )}

                    {descriptionExpanded && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDescriptionExpanded(false);
                        }}
                        className="text-left text-sm text-sky-700 dark:text-sky-500"
                      >
                        See Less
                      </button>
                    )}
                  </>
                )}
            </div>
          </div>

          {/* Bottom section with ratings, favorite button, and archive button */}
          <div className="flex items-center justify-between gap-2">
            {/* Left side - ratings */}
            <div className="flex items-center">
              {droplet.averageRating && droplet.averageRating != 0.0 ? (
                <div className="origin-left scale-[0.55]">
                  <StarRating
                    value={droplet.averageRating || 0}
                    enrollmentID={""}
                    average={true}
                    uniqueId={droplet.id.toString()}
                  />
                </div>
              ) : null}
            </div>

            {/* Right side - favorite and archive buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  exportDropletMarkdown();
                }}
                className={`${isAdmin ? "visible" : "invisible"} bg-slate-50 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-900`}
              >
                <div className="group relative">
                  <Download className="text-black dark:text-white" />
                  <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Export Markdown
                  </span>
                </div>
              </Button>

              {typeof isArchived === "boolean" && (
                <>
                  <Button
                    size="sm"
                    aria-label={isArchived ? "Unarchive" : "Archive"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      changeVisibility();
                    }}
                    className={`bg-slate-50 hover:bg-slate-300 dark:bg-slate-800`}
                  >
                    <div className="group relative">
                      {isArchived ? (
                        <ArchiveRestore className="text-purple-500" />
                      ) : (
                        <Archive className="text-purple-500" />
                      )}
                      <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {isArchived ? "Unarchive" : "Archive"}
                      </span>
                    </div>
                  </Button>
                  <Button
                    size="sm"
                    aria-label="Favorite"
                    disabled={isFavoritePending}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite();
                    }}
                    className={`bg-slate-50 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800`}
                  >
                    <div className="group relative">
                      {isFavorited || isHovering ? (
                        <FavoriteIcon className="text-pink-500" />
                      ) : (
                        <FavoriteBorderIcon className="text-purple-500" />
                      )}
                      <span className="absolute top-full left-1/2 mt-1 w-max -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {isFavorited ? "Unfavorite" : "Favorite"}
                      </span>
                    </div>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </li>
    </Link>
  );
}
