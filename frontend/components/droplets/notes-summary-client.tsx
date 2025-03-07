"use client";

import { useState } from "react";
import { Enrollment, Highlight, Note } from "@/types";
import { Card } from "../ui/card";
import Link from "next/link";
import { NotesContainer } from "./notes-container";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

export function NotesSummaryClient({
  index,
  dropletHighlights,
  dropletNotes,
  enrollment,
  allNotes,
}: {
  index: number;
  dropletHighlights: Highlight[];
  dropletNotes: Note[];
  enrollment: Enrollment;
  allNotes: {
    dropletId: number;
    notes: Note[];
    highlights: Highlight[];
  }[];
}) {
    const [openDroplets, setOpenDroplets] = useState<{[key:number]: boolean}>({});
    const [selectedDroplets, setSelectedDroplets] = useState<{[key:number]: boolean}>({});
    const toggleDroplets = (dropletId: number) => {
      setOpenDroplets((prev) => ({
        ...prev,
        [dropletId]: !prev[dropletId],
      }));
    };

    const toggleSelectedDroplets = (dropletId: number) => {
        setSelectedDroplets((prev) => ({
          ...prev,
          [dropletId]: !prev[dropletId],
        }));
      };

  return (
    <Card
      key={`enrollment-${enrollment.id}`}
      className="dark:bg-slate-800 p-2"
    >
        <div className={`text-2xl text-center flex ${openDroplets[enrollment.droplet.id] ? "border-b dark:border-slate-500" : ""} p-2 font-bold`}>
            <Checkbox
                id={enrollment.droplet.name}
                checked={selectedDroplets[enrollment.droplet.id]}
                onCheckedChange={() => toggleSelectedDroplets(enrollment.droplet.id)}
                className="border-sky-500 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 focus-visible:ring-sky-500"
            /> 
            <div className="flex-1 text-center">
                <Link href={`/d/${enrollment.droplet.slug}`}>
                    {enrollment.droplet.name}
                </Link>
            </div>
            <button
                className="ml-auto font-bold border dark:border-slate-500 flex justify-end py-2"
                onClick={() => toggleDroplets(enrollment.droplet.id)}
            >
                {openDroplets[enrollment.droplet.id] ? (
                <ChevronDown className="w-5 h-5" />
            ) : (
                <ChevronRight className="w-5 h-5" />
            )}
            </button>
        </div>
      {openDroplets[enrollment.droplet.id] && <NotesContainer
        allNotes={allNotes[index]}
        dropletHighlights={dropletHighlights}
        dropletNotes={dropletNotes}
        mappedLessons={enrollment.droplet.droplet_lessons}
      />}
    </Card>
  );
}
