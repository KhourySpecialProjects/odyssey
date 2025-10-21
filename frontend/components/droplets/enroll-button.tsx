"use client";

import { Button } from "@/components/ui/button";
import { createEnrollment, deleteEnrollment } from "@/lib/requests/enrollment";
import { DropletEnrollmentSchema } from "@/lib/validations/enrollment";
import { Droplet } from "@/types";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface EnrollButtonProps {
  droplet: Droplet;
  isEnrolled?: boolean;
}

export function EnrollButton({ droplet, isEnrolled }: EnrollButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (!droplet.lessons || droplet.lessons.length === 0) {
    return null;
  }

  async function enroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      try {
        startTransition(async () => {
          const enrollment = await createEnrollment(droplet, []);
          if (enrollment && enrollment.ok) {
            toast.success(`You are now enrolled in ${droplet.name}!`);
            if (droplet.lessons) {
              router.push(
                `/d/${droplet.slug}/${droplet.droplet_lessons[0].lesson.slug}`,
              );
            }
          } else {
            toast.error("Uh oh! Something went wrong.");
          }
        });
      } catch {
        toast.error("Failed to enroll in the course");
      }
    }
  }

  function unenroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      const values: z.infer<typeof DropletEnrollmentSchema> = {
        droplet: droplet.id,
        viewedLessons: [],
      };

      startTransition(() => {
        toast.promise(deleteEnrollment(values), {
          loading: "Unenrolling...",
          success: () => `You are now unenrolled from ${droplet.name}!`,
          error: (error) => (
            <div>
              <p>Uh oh! Something went wrong.</p>
              <pre>{error}</pre>
            </div>
          ),
        });
      });
    }
  }

  return (
    <Button
      size="lg"
      after={<ArrowRightIcon />}
      onClick={() => {
        if (droplet.lessons && droplet.lessons[0] && !isEnrolled) {
          enroll();
        } else {
          unenroll();
        }
      }}
      variant={isEnrolled ? "secondary" : "default"}
      className="dark:bg-slate-300 dark:text-black dark:hover:bg-slate-400"
    >
      {isEnrolled ? "Unenroll" : "Enroll and Continue"}
    </Button>
  );
}
