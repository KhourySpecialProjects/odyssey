"use client";

import { Sidebar } from "./sidebar";
import { Droplet, User } from "@/types";

interface DraftLayoutShellProps {
  user: User;
  droplet: Pick<
    Droplet,
    | "id"
    | "name"
    | "slug"
    | "lessons"
    | "status"
    | "inReview"
    | "afterReview"
    | "focusArea"
    | "learningObjectives"
    | "isHidden"
    | "type"
    | "originalDropletId"
    | "difficulty"
  >;
  availableDroplets: Pick<Droplet, "id" | "name" | "slug" | "lessons">[];
  children: React.ReactNode;
}

export function DraftLayoutShell({
  user,
  droplet,
  availableDroplets,
  children,
}: DraftLayoutShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:border-2 md:border-dashed md:border-slate-200 xl:flex-row md:dark:border-slate-700">
      <Sidebar
        droplet={droplet}
        user={user}
        availableDroplets={availableDroplets}
      />
      <main className="mx-auto w-full flex-1 items-center justify-center rounded-lg transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
