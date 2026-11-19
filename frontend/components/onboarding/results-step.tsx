"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { RecommendationTile } from "@/components/recommendations/recommendation-tile";
import { StartDropletButton } from "@/components/recommendations/start-droplet-button";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Recommendation } from "@/types";

interface ResultsStepProps {
  picks: Recommendation[];
  firstName: string;
  /** Called when the student starts a pick, opens the tour or finishes. */
  onLeave: () => void;
}

/** The quiz's last screen. Renders inside the quiz dialog. */
export function ResultsStep({ picks, firstName, onLeave }: ResultsStepProps) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <DialogTitle
          ref={heading}
          tabIndex={-1}
          className="text-xl font-bold outline-none"
        >
          You&apos;re all set, {firstName}!
        </DialogTitle>
        <DialogDescription className="mt-1">
          {picks.length > 0
            ? "Here are a few droplets picked for you. Start one now, or head to your Activity."
            : "We don't have picks for you just yet. They'll show up on your Activity as you explore."}
        </DialogDescription>
      </div>
      {picks.length > 0 && (
        <ul className="space-y-4">
          {picks.map((pick) => (
            <li key={pick.droplet.id} className="space-y-2">
              <RecommendationTile recommendation={pick} />
              <StartDropletButton droplet={pick.droplet} onStarted={onLeave} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        New to Odyssey?{" "}
        <Link
          href="/d/introduction-to-odyssey"
          onClick={onLeave}
          className="font-medium text-[#287697] underline dark:text-[#4AABCF]"
        >
          Take the Odyssey tour
        </Link>{" "}
        (optional).
      </p>
      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          size="sm"
          className="bg-onboarding hover:bg-onboarding/90 text-white"
          onClick={() => {
            onLeave();
            router.push("/activity");
          }}
        >
          Go to my Activity
        </Button>
      </div>
    </div>
  );
}
