"use client";

import { useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { enrollInVoyage } from "@/lib/requests/voyage-enrollment";
import { VoyageEnrollment } from "@/types";

interface VoyageEnrollButtonProps {
  voyageId: number;
  enrollment: VoyageEnrollment | null;
  completionPercentage: number;
  firstIncompleteSlug?: string;
}

export function VoyageEnrollButton({
  voyageId,
  enrollment,
  completionPercentage,
  firstIncompleteSlug,
}: VoyageEnrollButtonProps) {
  const [isPending, startTransition] = useTransition();

  const isEnrolled = enrollment !== null;
  const isCompleted = isEnrolled && completionPercentage >= 100;

  function handleEnroll() {
    startTransition(async () => {
      await enrollInVoyage(voyageId);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Primary CTA */}
      {!isEnrolled && (
        <Button
          onClick={handleEnroll}
          disabled={isPending}
          className={cn(
            "bg-[#297496] text-white hover:bg-[#1f5a73]",
            "disabled:opacity-60",
          )}
        >
          {isPending ? "Enrolling..." : "Enroll in Voyage"}
        </Button>
      )}

      {isEnrolled && isCompleted && (
        <Button disabled className="bg-green-600 text-white opacity-80">
          Completed ✓
        </Button>
      )}

      {isEnrolled && !isCompleted && firstIncompleteSlug && (
        <Link href={`/p/${firstIncompleteSlug}`}>
          <Button
            variant="outline"
            className="border-[#297496] text-[#297496] hover:bg-[#297496]/10"
          >
            Continue Voyage
            <span className="ml-2 rounded-full bg-[#297496] px-2 py-0.5 text-xs font-semibold text-white">
              {completionPercentage}%
            </span>
          </Button>
        </Link>
      )}
    </div>
  );
}
