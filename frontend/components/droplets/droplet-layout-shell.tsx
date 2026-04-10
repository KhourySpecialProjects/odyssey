"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "./sidebar";
import { Droplet, User } from "@/types";

interface DropletLayoutShellProps {
  user: User | null;
  author: boolean;
  droplet: Pick<Droplet, "name" | "slug" | "lessons" | "status" | "id">;
  completedLessonIds: number[];
  enrollmentId?: string;
  children: React.ReactNode;
}

export function DropletLayoutShell({
  user,
  author,
  droplet,
  completedLessonIds,
  enrollmentId,
  children,
}: DropletLayoutShellProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex min-h-screen flex-col md:border-2 md:border-dashed md:border-slate-200 xl:flex-row md:dark:border-slate-700">
      <Sidebar
        author={author}
        user={user}
        droplet={droplet}
        completedLessonIds={completedLessonIds}
        enrollmentId={enrollmentId}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <main
        className={cn(
          "mx-auto w-full flex-1 items-center justify-center rounded-lg transition-all duration-300",
          expanded ? "xl:pl-64" : "xl:pl-0",
        )}
      >
        {children}
      </main>
    </div>
  );
}
