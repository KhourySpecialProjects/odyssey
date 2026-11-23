"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createEnrollment } from "@/lib/requests/enrollment";
import { cn } from "@/lib/utils";
import type { RecommendedDroplet } from "@/types";

/** Enrolls the student in a recommended droplet, then opens it. */
export function StartDropletButton({
  droplet,
  onStarted,
  className,
}: {
  droplet: RecommendedDroplet;
  /** Runs after enrolling, before leaving the page. */
  onStarted?: () => Promise<unknown> | void;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      const result = await createEnrollment(droplet, []);
      if (!result || !("ok" in result) || !result.ok) {
        toast.error(`Couldn't start ${droplet.name}. Try again.`);
        return;
      }
      await onStarted?.();
      router.push(`/d/${droplet.slug}`);
    });

  return (
    <Button
      type="button"
      onClick={start}
      disabled={isPending}
      after={<ArrowRight aria-hidden size={16} />}
      className={cn(
        "h-10 gap-2 rounded-lg border border-[#2d7597] bg-[#2d7597] px-4 text-white shadow-[0_1px_1px_rgba(16,24,40,0.05)] hover:bg-[#2d7597]/90 dark:bg-[#2d7597] dark:text-white dark:hover:bg-[#2d7597]/90",
        className,
      )}
    >
      Start droplet
    </Button>
  );
}
