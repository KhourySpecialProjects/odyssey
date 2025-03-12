"use client";

import { Button } from "@/components/ui/button";
import { createEnrollment, deleteEnrollment } from "@/lib/actions";
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
  const [_, startTransition] = useTransition();

  if (!droplet.lessons || droplet.lessons.length === 0) {
    return null;
  }

  function enroll() {
    if (droplet.lessons && droplet.lessons.length > 0) {
      const values: z.infer<typeof DropletEnrollmentSchema> = {
        droplet: droplet.id,
        viewedLessons: [],
      };

      startTransition(() => {
        toast.promise(createEnrollment(values), {
          loading: "Enrolling...",
          success: () => `You are now enrolled in ${droplet.name}!`,
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
        console.log("enrollment button clicked");
        if (droplet.lessons && droplet.lessons[0] && !isEnrolled) {
          console.log("enrolling...");
          enroll();
          router.push(`/d/${droplet.slug}/${droplet.lessons[0].slug}`);
        } else {
          console.log("was already enrolled");
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
